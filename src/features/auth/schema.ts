import { z } from 'zod';

import { addressField, dobField, phoneField } from '@/features/account/fields';

/**
 * Sign-up and sign-in shapes.
 *
 * `name` mirrors the 60-character ceiling the `users` create rule enforces, so
 * the listener sees the error before the round trip rather than a rejected
 * write. The password floor is Firebase's own minimum — anything shorter is
 * refused by the server with an opaque `auth/weak-password`.
 */

export const NAME_MAX = 60;
export const PASSWORD_MIN = 6;

const email = z
  .string()
  .trim()
  .min(1, 'Please enter your email')
  .email('That does not look like an email address');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password'),
});

/**
 * `phone`, `address` and `dob` are collected at signup but stay optional — a
 * listener who only wants to press play should not be blocked on an address.
 * They share their definitions with the profile sheet, so a value accepted here
 * is accepted there and by the same Firestore rule.
 */
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name')
    .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(4096),
  phone: phoneField,
  address: addressField,
  dob: dobField,
});

export const resetSchema = z.object({ email });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetInput = z.infer<typeof resetSchema>;

/**
 * Turns a Firebase `auth/*` code into something a listener can act on.
 *
 * The SDK's own messages leak implementation detail ("INVALID_LOGIN_CREDENTIALS")
 * and, since the introduction of email enumeration protection, sign-in failures
 * arrive as one indistinguishable code whether the address is unknown or the
 * password is wrong — so the copy deliberately covers both.
 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.';
    case 'auth/invalid-email':
      return 'That does not look like an email address.';
    case 'auth/weak-password':
      return `Password must be at least ${PASSWORD_MIN} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
