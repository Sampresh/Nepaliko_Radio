import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authErrorMessage, type SignInInput, type SignUpInput } from '@/features/auth/schema';
import type { ProfileDetailsInput } from '@/features/profile/schema';
import { auth, db } from '@/services/firebase';
import { captureError } from '@/services/monitoring';
import type { UserProfile, UserProfileDoc } from '@/types/firestore';

/**
 * Accounts, on Firebase alone.
 *
 * Everything here runs against the client SDK — no Cloud Functions, no second
 * backend. Verification and reset emails are Firebase's own, which cost nothing
 * on the Spark plan and need no SMTP credentials anywhere near the app. Their
 * wording is edited in Console → Authentication → Templates.
 *
 * An account is optional: the tabs render signed out, and nothing in this file
 * gates the radio. It exists so a listener who wants an identity can have one.
 */
interface AuthState {
  user: User | null;
  /** The `users/{uid}` document. Null until it loads, or if the read failed. */
  profile: UserProfile | null;
  /**
   * True only until the very first `onAuthStateChanged` fires. The splash waits
   * on this, so it must never go true again — flipping it during a later
   * sign-in would bounce the listener back to the splash mid-session.
   */
  initialising: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  /** Firebase's own reset email. Resolves even for an address with no account. */
  resetPassword: (email: string) => Promise<void>;
  /** Re-sends the verification email to the signed-in listener. */
  resendVerification: () => Promise<void>;
  updateDetails: (details: ProfileDetailsInput) => Promise<void>;
  /**
   * Deletes the profile document and then the Auth account. `password` is
   * required when the session is too old for Firebase to accept the deletion.
   */
  deleteAccount: (password?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Firebase throws plain `Error`s with a `code`; narrow it without casting to any. */
function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
}

/** Rethrows a Firebase auth failure as something safe to show the user. */
function asDisplayError(error: unknown): Error {
  return new Error(authErrorMessage(errorCode(error)));
}

function toProfile(id: string, data: UserProfileDoc): UserProfile {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate() ?? null,
    lastSeenAt: data.lastSeenAt?.toDate() ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setInitialising(false);
        return;
      }

      // A missing or unreadable profile must not block sign-in: the session is
      // valid either way, and the profile screen falls back to the Auth record.
      try {
        const snapshot = await getDoc(doc(db, 'users', nextUser.uid));
        setProfile(snapshot.exists() ? toProfile(snapshot.id, snapshot.data() as UserProfileDoc) : null);
      } catch {
        setProfile(null);
      }

      setInitialising(false);
    });
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Best-effort activity stamp for the admin roster; never block sign-in.
      setDoc(
        doc(db, 'users', credential.user.uid),
        { lastSeenAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    } catch (error) {
      throw asDisplayError(error);
    }
  }, []);

  const signUp = useCallback(
    async ({ name, email, password, phone, address, dob }: SignUpInput) => {
      // Only the account creation itself is user-facing. Once it resolves the
      // listener is signed in and the UI has already moved on, so a later
      // failure must not be reported as "sign-up failed" — the account exists,
      // and saying otherwise invites a retry that fails with email-already-in-use.
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        throw asDisplayError(error);
      }

      // The display name lives on the Auth record so it survives even if the
      // Firestore write fails; the profile document is what the admin panel
      // lists, since Firestore cannot query the Auth user list.
      await updateProfile(credential.user, { displayName: name }).catch((error: unknown) =>
        captureError(error, 'auth.signUp.updateProfile')
      );

      // Firebase sends this one itself, free on Spark. Best-effort: an
      // unverified address is a nudge on the profile screen, not a locked door.
      sendEmailVerification(credential.user).catch((error: unknown) =>
        captureError(error, 'auth.signUp.sendVerification')
      );

      try {
        await setDoc(doc(db, 'users', credential.user.uid), {
          name,
          email,
          phone,
          address,
          dob,
          createdAt: serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        });

        const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
        if (snapshot.exists()) {
          setProfile(toProfile(snapshot.id, snapshot.data() as UserProfileDoc));
        }
      } catch (error) {
        // Almost always permission-denied from an undeployed `users` rule. The
        // listener keeps a working session; the admin roster is what suffers.
        captureError(error, 'auth.signUp.writeProfile');
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // `auth/user-not-found` is deliberately not distinguished: reporting it
      // would turn this form into an oracle for which addresses have accounts.
      if (errorCode(error) === 'auth/user-not-found') return;
      throw asDisplayError(error);
    }
  }, []);

  const resendVerification = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('You are signed out. Sign in again first.');

    try {
      await sendEmailVerification(current);
    } catch (error) {
      throw asDisplayError(error);
    }
  }, []);

  const updateDetails = useCallback(async (details: ProfileDetailsInput) => {
    const current = auth.currentUser;
    if (!current) throw new Error('You are signed out. Sign in again to edit your profile.');

    try {
      // `merge` rather than a full set: `createdAt` is not in this payload, and
      // the update rule requires it to come through unchanged — a plain set
      // would drop it and be rejected.
      await setDoc(doc(db, 'users', current.uid), details, { merge: true });
    } catch (error) {
      captureError(error, 'auth.updateDetails');
      throw new Error('Could not save your profile. Check your connection and try again.');
    }

    // The name also lives on the Auth record, which is what the profile falls
    // back to when the Firestore read fails. Best-effort: the document is
    // already saved, so a failure here must not be reported as a failed save.
    if (details.name !== current.displayName) {
      updateProfile(current, { displayName: details.name }).catch((error: unknown) =>
        captureError(error, 'auth.updateDetails.displayName')
      );
    }

    // Patched in place rather than re-read. `serverTimestamp` resolves
    // asynchronously, so an immediate `getDoc` can still return the pre-write
    // snapshot and make the save look like it did nothing.
    setProfile((previous) =>
      previous
        ? { ...previous, ...details }
        : {
            id: current.uid,
            email: current.email ?? '',
            createdAt: null,
            lastSeenAt: null,
            ...details,
          }
    );
  }, []);

  /**
   * Account deletion, required by both app stores.
   *
   * The Firestore document goes first, while the session is still valid — the
   * rules key deletion on `request.auth.uid`, so once the Auth user is gone
   * nothing could ever remove the row and it would linger in the admin roster.
   *
   * Firebase refuses to delete an account on a session older than a few minutes
   * and reports `auth/requires-recent-login`. Rather than surface that as an
   * error, the caller is asked for a password and it is retried.
   */
  const deleteAccount = useCallback(async (password?: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('You are already signed out.');

    if (password) {
      if (!current.email) throw new Error('This account has no email address.');
      try {
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, password)
        );
      } catch (error) {
        throw asDisplayError(error);
      }
    }

    try {
      await deleteDoc(doc(db, 'users', current.uid));
    } catch (error) {
      // Not fatal on its own — an admin can still remove the row — but it must
      // be recorded, because the account is about to become unreachable.
      captureError(error, 'auth.deleteAccount.profile');
    }

    try {
      await deleteUser(current);
    } catch (error) {
      if (errorCode(error) === 'auth/requires-recent-login') {
        throw new Error('REAUTH_REQUIRED');
      }
      throw asDisplayError(error);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      initialising,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      updateDetails,
      deleteAccount,
      signOutUser,
    }),
    [
      user,
      profile,
      initialising,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      updateDetails,
      deleteAccount,
      signOutUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
