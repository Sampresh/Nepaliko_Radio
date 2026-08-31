import { doc, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { auth, db } from '@/services/firebase';
import { captureError } from '@/services/monitoring';

/**
 * Keeps `emailVerified` fresh while the banner is on screen.
 *
 * The bug this fixes: Firebase caches the user object locally, and
 * `emailVerified` only changes after `reload()` pulls a new token. Clicking the
 * link in a mail app changes nothing the SDK can see, so the banner used to sit
 * there until the app was killed and relaunched.
 *
 * Three ways out, because each one covers a gap in the others:
 *
 *  - **Foreground** catches the common path — tap the link, come back, gone.
 *  - **Polling** catches verifying on another device, or in a browser that
 *    never backgrounded the app.
 *  - **The manual button** catches everything else, and is the only one the
 *    listener can see working.
 *
 * All three stop the moment verification lands, and none of them run when the
 * banner is hidden.
 */

/** How often to re-check while the banner is visible. */
const POLL_MS = 5_000;
/** Give up after this; a listener who has not verified by now will use the button. */
const POLL_CEILING_MS = 3 * 60_000;

export interface EmailVerification {
  /** False only when there is a signed-in user whose address is unconfirmed. */
  verified: boolean;
  /** True while a manual check is in flight, for the button's busy state. */
  checking: boolean;
  /** Set after a manual check that found nothing, cleared on the next attempt. */
  notYet: boolean;
  /** Re-checks now. Resolves to the fresh value. */
  check: () => Promise<boolean>;
}

export function useEmailVerification(): EmailVerification {
  const [verified, setVerified] = useState(() => auth.currentUser?.emailVerified ?? true);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  /**
   * Mirrors the flag onto `users/{uid}` so the admin roster shows it without
   * anyone having to ask the Auth API per row — Firestore cannot join against
   * the Auth user list.
   */
  const mirror = useCallback(async (uid: string) => {
    await setDoc(doc(db, 'users', uid), { emailVerified: true }, { merge: true }).catch(
      (error: unknown) => captureError(error, 'auth.mirrorEmailVerified')
    );
  }, []);

  /** One round trip. Returns the fresh value and updates state if it changed. */
  const refresh = useCallback(async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return true;
    if (current.emailVerified) return true;

    try {
      await current.reload();
    } catch (error) {
      // Offline, or the token was revoked. Either way there is nothing to
      // report to the listener — the next attempt will try again.
      captureError(error, 'auth.reloadForVerification');
      return false;
    }

    const now = auth.currentUser?.emailVerified ?? false;
    if (now) {
      setVerified(true);
      await mirror(current.uid);
    }
    return now;
  }, [mirror]);

  // Re-seed whenever the signed-in user changes, so signing out and into a
  // different account does not carry the previous verdict across.
  const uid = auth.currentUser?.uid ?? null;
  useEffect(() => {
    setVerified(auth.currentUser?.emailVerified ?? true);
    setNotYet(false);
  }, [uid]);

  // (a) Coming back to the foreground.
  useEffect(() => {
    if (verified) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [verified, refresh]);

  // (b) Polling, only while unverified, and only up to the ceiling.
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (verified) {
      startedAt.current = null;
      return;
    }

    startedAt.current ??= Date.now();

    const timer = setInterval(() => {
      if (startedAt.current && Date.now() - startedAt.current > POLL_CEILING_MS) {
        clearInterval(timer);
        return;
      }
      void refresh();
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [verified, refresh]);

  // (c) The manual button.
  const check = useCallback(async () => {
    setChecking(true);
    setNotYet(false);
    try {
      const now = await refresh();
      if (!now) setNotYet(true);
      return now;
    } finally {
      setChecking(false);
    }
  }, [refresh]);

  return { verified, checking, notYet, check };
}
