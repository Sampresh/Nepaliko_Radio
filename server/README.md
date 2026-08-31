# Notification API

The one server endpoint in this project: `POST /api/send-notification`.

## Why it exists

Everything else in the app talks to Firebase directly from the client, under
security rules. Sending to an FCM topic is the single thing that cannot work
that way — it needs a service-account credential, and a credential in a browser
bundle is full admin access to the Firebase project for anyone who opens
DevTools.

FCM itself is free and unlimited on the Spark plan. Only the *sending* needs a
server, and this is it.

## Contract

`POST /api/send-notification`
`Authorization: Bearer <Firebase ID token>`

```json
{
  "topic": "alerts" | "all" | "news",
  "title": "string, max 65",
  "body":  "string, max 240",
  "link":  "/optional/in-app/path",
  "priority": "high" | "normal"
}
```

Success: `{ ok, messageId, auditId, sentAt }`.
Failure: `{ error: { code, message } }` with a matching HTTP status.

Order of operations, and it matters:

1. Reject non-`POST`; answer the CORS preflight
2. `verifyIdToken()` — the uid is never taken from the body
3. Confirm `admins/{uid}` exists, read fresh on every call so revoking an admin
   takes effect immediately
4. Validate with zod; enforce the length caps; reject anything but an in-app path
5. Rate limit, in a transaction: 10 sends per admin per hour
6. Open the audit record **before** sending
7. Send to the topic
8. Annotate the record with the result

The audit record is opened first because a broadcast cannot be recalled. If the
process dies mid-flight, the evidence that something went out has to already
exist.

## Environment

Set in the Vercel dashboard, never in git and never in a chat:

| Variable | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | The full service-account JSON, on one line |
| `FIREBASE_PROJECT_ID` | `nepaliko-radio` |

Generate the key at Firebase console → Project settings → Service accounts →
Generate new private key. It grants full admin access to the project: it belongs
here and nowhere else.

## Deploying

```sh
npx vercel login
npx vercel link      # from this directory
npx vercel --prod
```

Then point the admin panel at it — `admin/.env`:

```
VITE_NOTIFY_URL=https://<your-project>.vercel.app
```

Vite inlines that at build time, so rebuild and redeploy hosting after changing
it.

## Tests

```sh
npm run smoke
```

18 cases, no credentials needed: method handling, CORS, the auth guard, and the
payload rules — including that a uid in the body authenticates nobody, and that
`javascript:`, absolute and protocol-relative links are all rejected.
