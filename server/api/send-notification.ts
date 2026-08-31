import { messaging } from './_lib/admin';
import { ApiError, handler, requireAdmin } from './_lib/http';
import { closeAudit, consumeQuota, openAudit, parseNotification } from './_lib/notification';

/**
 * The one server endpoint.
 *
 * Everything else in this app talks to Firebase directly from the client, under
 * security rules. Sending to an FCM topic is the single thing that cannot work
 * that way: it needs a service-account credential, and a credential in a
 * browser bundle is full admin access to the project for anyone who looks.
 *
 * Order matters, and it is: authenticate, authorise, validate, rate limit,
 * record, send, annotate. The record is opened before the send because a
 * broadcast cannot be recalled — if the process dies mid-flight, the evidence
 * that something went out has to already exist.
 */
export default handler(async (body, request) => {
  const caller = await requireAdmin(request);
  const input = parseNotification(body);

  await consumeQuota(caller.uid);

  const auditId = await openAudit(input, caller);

  try {
    const messageId = await messaging.send({
      topic: input.topic,
      notification: { title: input.title, body: input.body },
      // The data payload is what the app reads on tap. Every value must be a
      // string — FCM rejects the message outright otherwise, which would look
      // like a delivery failure rather than a malformed payload.
      data: {
        topic: input.topic,
        ...(input.link ? { link: input.link } : {}),
      },
      android: {
        priority: input.priority === 'high' ? 'high' : 'normal',
        notification: {
          // Routes the message to the channel the app created with the matching
          // id, which is what gives alerts their heads-up importance. A channel
          // id that does not exist on the device silently drops to default.
          channelId: input.topic,
          // Two alerts about the same emergency should replace one another
          // rather than stack up; two different posts should not.
          tag: input.topic === 'alerts' ? 'alerts' : undefined,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: input.topic === 'alerts' ? 'default' : undefined,
            // `critical` needs an Apple entitlement that is effectively
            // reserved for official agencies; `time-sensitive` is what a station
            // can actually get, and it still breaks through Focus modes.
            'interruption-level': input.topic === 'alerts' ? 'time-sensitive' : 'active',
          },
        },
      },
    });

    await closeAudit(auditId, { status: 'sent', messageId });
    return { ok: true, messageId, auditId, sentAt: new Date().toISOString() };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await closeAudit(auditId, { status: 'failed', error: detail });

    console.error('FCM send failed', detail);
    throw new ApiError('internal', 'The notification could not be sent. Nothing was delivered.');
  }
});
