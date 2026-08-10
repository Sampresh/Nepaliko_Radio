import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

const REGION = 'asia-south1';

/** Words that get a request auto-flagged for review rather than shown as new. */
const BLOCKLIST = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'asshole',
  'randi',
  'muji',
  'gandu',
];

const MAX_PER_HOUR = 3;

function containsProfanity(text: string): boolean {
  const normalised = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  return BLOCKLIST.some((word) => new RegExp(`\\b${word}\\b`).test(normalised));
}

/**
 * Server-side moderation for listener requests.
 *
 * The client throttles too, but that lives in AsyncStorage and a determined
 * user can clear it. This is the authoritative limit — it counts real documents
 * from the same install in the past hour and deletes anything over the line.
 */
export const moderateRequest = onDocumentCreated(
  { document: 'requests/{requestId}', region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const deviceHash: string | undefined = data.deviceHash;
    const message: string = data.message ?? '';
    const name: string = data.name ?? '';

    if (deviceHash) {
      const hourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
      const recent = await db
        .collection('requests')
        .where('deviceHash', '==', deviceHash)
        .where('createdAt', '>=', hourAgo)
        .count()
        .get();

      // The new document is included in the count, hence >.
      if (recent.data().count > MAX_PER_HOUR) {
        logger.info('Rate limit exceeded, dropping request', { deviceHash });
        await snapshot.ref.delete();
        return;
      }
    }

    if (containsProfanity(message) || containsProfanity(name)) {
      logger.info('Request flagged by profanity filter', { id: snapshot.id });
      await snapshot.ref.update({ status: 'flagged' });
    }
  }
);

interface SendPushPayload {
  title: string;
  body: string;
  topic: 'news' | 'liveAlerts';
}

/**
 * Sends a push to every device opted into `topic`.
 *
 * Admin-only: the caller must be signed in and present in `admins`. Expo's
 * push service has no topic concept, so we fan out over the `devices`
 * collection in batches of 100 (Expo's documented maximum per request).
 */
export const sendPush = onCall<SendPushPayload>({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const admin = await db.doc(`admins/${uid}`).get();
  if (!admin.exists) throw new HttpsError('permission-denied', 'Admins only.');

  const { title, body, topic } = request.data;
  if (!title?.trim() || !body?.trim()) {
    throw new HttpsError('invalid-argument', 'Title and body are required.');
  }
  if (topic !== 'news' && topic !== 'liveAlerts') {
    throw new HttpsError('invalid-argument', 'Unknown topic.');
  }

  const devices = await db.collection('devices').where(topic, '==', true).get();
  const tokens = devices.docs.map((d) => d.get('token') as string).filter(Boolean);

  if (!tokens.length) return { sent: 0 };

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        chunk.map((to) => ({ to, title, body, sound: 'default', channelId: 'default' }))
      ),
    });

    if (!response.ok) {
      logger.error('Expo push failed', { status: response.status });
      continue;
    }
    sent += chunk.length;
  }

  await db.collection('pushLog').add({
    title,
    body,
    topic,
    sent,
    sentBy: uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { sent };
});
