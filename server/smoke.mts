import { generateKeyPairSync } from 'node:crypto';

/**
 * Contract tests for the send endpoint.
 *
 * Everything covered here is rejected before Firestore or FCM is touched, so
 * the run needs no real credentials — a throwaway key is generated purely so
 * `cert()` has a well-formed PEM to parse at import time.
 *
 * The cases that matter most are the negative ones. This endpoint broadcasts to
 * every listener and cannot be recalled, so "refuses an anonymous caller" and
 * "refuses an over-long alert" are the tests worth having.
 *
 * Run with `npm run smoke`.
 */

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'smoke-test',
  private_key_id: 'smoke',
  private_key: privateKey,
  client_email: 'smoke@smoke-test.iam.gserviceaccount.com',
  client_id: '0',
  token_uri: 'https://oauth2.googleapis.com/token',
});
process.env.FIREBASE_PROJECT_ID ??= 'smoke-test';

const TITLE_MAX = 65;
const BODY_MAX = 240;
const valid = { topic: 'news', title: 'A new post', body: 'Read it in the app.' };

interface Case {
  name: string;
  body?: unknown;
  method?: string;
  headers?: Record<string, string>;
  expectStatus: number;
  expectCode?: string;
}

const cases: Case[] = [
  { name: 'GET is rejected', method: 'GET', expectStatus: 405 },
  { name: 'OPTIONS preflight succeeds', method: 'OPTIONS', expectStatus: 204 },
  {
    name: 'anonymous callers are refused before anything else',
    body: valid,
    expectStatus: 401,
    expectCode: 'unauthenticated',
  },
  {
    name: 'a junk bearer token is refused',
    body: valid,
    headers: { authorization: 'Bearer not-a-real-token' },
    expectStatus: 401,
    expectCode: 'unauthenticated',
  },
  {
    // The uid is taken from the verified token, never the body — asserting one
    // here must change nothing.
    name: 'a uid in the body does not authenticate anyone',
    body: { ...valid, uid: 'some-admin-uid', sentBy: 'some-admin-uid' },
    expectStatus: 401,
    expectCode: 'unauthenticated',
  },
  { name: 'an unparseable body is refused', body: '{not json', expectStatus: 400 },
];

/**
 * Payload validation, checked directly against the schema.
 *
 * These cannot go through the handler because auth runs first and would mask
 * them with a 401 — which is the correct order for the endpoint and the wrong
 * one for testing the rules themselves.
 */
const payloadCases: { name: string; input: unknown; valid: boolean }[] = [
  { name: 'a well-formed notification', input: valid, valid: true },
  { name: 'an unknown topic', input: { ...valid, topic: 'everyone' }, valid: false },
  { name: 'an empty title', input: { ...valid, title: '   ' }, valid: false },
  { name: 'an empty body', input: { ...valid, body: '' }, valid: false },
  {
    name: `a title at the ${TITLE_MAX}-character cap`,
    input: { ...valid, title: 'a'.repeat(TITLE_MAX) },
    valid: true,
  },
  {
    name: 'a title one character over the cap',
    input: { ...valid, title: 'a'.repeat(TITLE_MAX + 1) },
    valid: false,
  },
  {
    name: `a body at the ${BODY_MAX}-character cap`,
    input: { ...valid, body: 'a'.repeat(BODY_MAX) },
    valid: true,
  },
  {
    name: 'a body one character over the cap',
    input: { ...valid, body: 'a'.repeat(BODY_MAX + 1) },
    valid: false,
  },
  { name: 'an in-app link', input: { ...valid, link: '/post/abc123' }, valid: true },
  // A notification payload is attacker-influenced in the general case, and the
  // app hands `link` straight to its router.
  { name: 'an absolute http link', input: { ...valid, link: 'https://evil.example' }, valid: false },
  { name: 'a protocol-relative link', input: { ...valid, link: '//evil.example' }, valid: false },
  { name: 'a javascript: link', input: { ...valid, link: 'javascript:alert(1)' }, valid: false },
];

let failed = 0;

function report(ok: boolean, label: string, detail = '') {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
}

const { default: send } = await import('./api/send-notification.ts');

for (const testCase of cases) {
  let status = 0;
  let payload: { error?: { code?: string } } | null = null;
  const headers: Record<string, string> = {};

  const response = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      status = code;
      return response;
    },
    json(value: unknown) {
      payload = value as typeof payload;
      return response;
    },
    end() {
      return response;
    },
  };

  await send(
    {
      method: testCase.method ?? 'POST',
      headers: testCase.headers ?? {},
      body: testCase.body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response as any
  );

  const code = payload?.error?.code;
  const corsOk = headers['access-control-allow-origin'] === '*';
  const ok =
    status === testCase.expectStatus && corsOk && (!testCase.expectCode || code === testCase.expectCode);
  report(ok, testCase.name, `-> ${status}${code ? ` ${code}` : ''}`);
}

const { notificationSchema } = await import('./api/_lib/notification.ts');

for (const testCase of payloadCases) {
  const result = notificationSchema.safeParse(testCase.input);
  report(
    result.success === testCase.valid,
    `payload: ${testCase.name}`,
    `-> ${result.success ? 'accepted' : 'rejected'}`
  );
}

const total = cases.length + payloadCases.length;
console.log(failed ? `\n${failed} of ${total} failing` : `\nall ${total} passing`);
process.exit(failed ? 1 : 0);
