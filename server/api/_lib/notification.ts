import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { db } from './admin';
import { ApiError } from './http';

/**
 * The shape and the limits of a push.
 *
 * The caps are not arbitrary. Android collapses a title past roughly 65
 * characters and a body past roughly 240 on a lock screen, so anything longer
 * is not "more information", it is information the reader never sees — worst of
 * all in an alert, where the part that gets truncated is usually the
 * instruction.
 */

export const TITLE_MAX = 65;
export const BODY_MAX = 240;

/** Must match `TOPICS` in the app's `src/services/notifications.ts`. */
export const TOPICS = ['alerts', 'all', 'news'] as const;
export type Topic = (typeof TOPICS)[number];

export const notificationSchema = z.object({
  topic: z.enum(TOPICS),
  title: z.string().trim().min(1, 'A title is required').max(TITLE_MAX),
  body: z.string().trim().min(1, 'A message is required').max(BODY_MAX),
  /**
   * An in-app path such as `/post/abc123`. Deliberately not a URL: the app
   * hands this to its router, and anything absolute would let a notification
   * open somewhere the app never intended.
   */
  link: z
    .string()
    .trim()
    .regex(/^\/(?!\/)[\w\-/[\]().]*$/, 'Use an in-app path such as /news')
    .max(200)
    .optional()
    .or(z.literal('')),
  priority: z.enum(['high', 'normal']).default('high'),
});

export type NotificationInput = z.infer<typeof notificationSchema>;

export function parseNotification(body: unknown): NotificationInput {
  const result = notificationSchema.safeParse(body);
  if (!result.success) {
    throw new ApiError(
      'invalid-argument',
      result.error.issues[0]?.message ?? 'That message is not valid.'
    );
  }
  return result.data;
}

/** Sends per admin per window. Generous for real use, tight enough to bound a mistake. */
const MAX_SENDS = 10;
const WINDOW_MINUTES = 60;

/**
 * Rate limit, counted per admin.
 *
 * A transaction rather than a read-then-write: two tabs, or a double-tap on a
 * slow connection, would otherwise both read the same count and both proceed.
 * The whole point of a limit on a broadcast that cannot be recalled is that it
 * holds under exactly that kind of accident.
 */
export async function consumeQuota(uid: string): Promise<void> {
  const ref = db.doc(`notificationQuota/${uid}`);
  const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous: Timestamp[] = snapshot.exists ? (snapshot.get('sends') ?? []) : [];
    const sends = previous.filter((stamp) => stamp.toMillis() >= windowStart);

    if (sends.length >= MAX_SENDS) {
      throw new ApiError(
        'resource-exhausted',
        `That is ${MAX_SENDS} notifications in an hour. Wait a while before sending another.`
      );
    }

    transaction.set(ref, { sends: [...sends, Timestamp.now()] });
  });
}

/**
 * Opens an audit record before anything is sent.
 *
 * Written first on purpose. If the FCM call succeeds and the process then dies,
 * a record written afterwards would never exist — and a broadcast that went out
 * with nothing on the record is the one case this log has to cover.
 */
export async function openAudit(
  input: NotificationInput,
  caller: { uid: string; email: string }
): Promise<string> {
  const ref = await db.collection('notifications').add({
    ...input,
    link: input.link || '',
    sentBy: caller.uid,
    sentByEmail: caller.email,
    sentAt: FieldValue.serverTimestamp(),
    status: 'pending',
  });
  return ref.id;
}

export async function closeAudit(
  id: string,
  result: { status: 'sent'; messageId: string } | { status: 'failed'; error: string }
): Promise<void> {
  // Best-effort: the message has already gone out, and failing to annotate the
  // record must not turn a successful send into a reported failure.
  await db
    .doc(`notifications/${id}`)
    .set(result, { merge: true })
    .catch((error: unknown) => console.error('Could not close audit record', id, error));
}
