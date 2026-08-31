import { z } from 'zod';

import { addressField, dobField, phoneField } from '@/features/account/fields';
import { NAME_MAX } from '@/features/auth/schema';

/**
 * The editable half of `users/{uid}`.
 *
 * Email is deliberately absent: it is the Auth credential, and changing it is a
 * re-authentication flow rather than a profile edit. The sheet shows it as a
 * read-only fact.
 *
 * Every optional field is stored as `''` when cleared rather than deleted, so
 * the document keeps a stable shape for the admin roster to render.
 */

export const profileDetailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name')
    .max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`),
  phone: phoneField,
  address: addressField,
  dob: dobField,
});

export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>;

/**
 * Re-exported so the profile screens and their tests keep one import path even
 * though signup shares the same field definitions.
 */
export {
  ADDRESS_MAX,
  DOB_PATTERN,
  PHONE_MAX,
  formatDob,
  isRealPastDate,
} from '@/features/account/fields';
