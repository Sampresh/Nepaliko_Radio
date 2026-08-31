import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * The Admin SDK, credentialed from the environment.
 *
 * This is the reason the endpoint exists at all. Sending to an FCM topic needs
 * a service-account credential, and a credential in browser JavaScript is full
 * admin access to the project for anyone who opens DevTools. It lives here and
 * only here.
 *
 * Vercel keeps multi-line values intact, but a key pasted through a shell often
 * arrives with its newlines escaped, which makes the PEM unparseable and fails
 * with a signature error that names nothing useful. The `\n` repair covers that.
 */

function credentials(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. Add the service account JSON to the environment.'
    );
  }

  let parsed: ServiceAccount & { private_key?: string; privateKey?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
  }

  const key = parsed.private_key ?? parsed.privateKey;
  if (key) {
    const repaired = key.replace(/\\n/g, '\n');
    parsed.private_key = repaired;
    parsed.privateKey = repaired;
  }

  return parsed;
}

// Serverless instances are reused between invocations, so this must not
// re-initialise on a warm start.
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(credentials()),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

export const db = getFirestore(app);
export const adminAuth = getAuth(app);
export const messaging = getMessaging(app);
