import { z } from 'zod';

/**
 * Contact fields shared by signup and the profile sheet.
 *
 * They live here rather than in either feature's schema because both need them
 * and `profile/schema.ts` already imports `NAME_MAX` from `auth/schema.ts` —
 * putting them in either file would close that import into a cycle. This module
 * depends on nothing but zod, so it can be imported from both.
 */

export const PHONE_MAX = 30;
export const ADDRESS_MAX = 200;

/** Matches the `dob.size() == 10` assertion in the Firestore rules. */
export const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The oldest birth year the calendar offers. */
export const DOB_MIN_YEAR = 1920;

/**
 * Trims, and treats a blank field as "not provided" rather than an error.
 *
 * Deliberately not `.optional()`: every form renders these inputs, so the value
 * is always a string. Marking them optional would split zod's input type from
 * its output type, and `useForm` cannot reconcile the two.
 */
const optionalText = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

export const phoneField = optionalText(PHONE_MAX, 'That number looks too long').refine(
  (value) => value === '' || /^[+\d][\d\s()-]{5,}$/.test(value),
  'Enter a phone number, digits only apart from + ( ) and spaces'
);

export const addressField = optionalText(ADDRESS_MAX, 'That address is too long');

export const dobField = optionalText(10, 'Use the format YYYY-MM-DD').refine(
  (value) => value === '' || isRealPastDate(value),
  'Enter a real past date as YYYY-MM-DD'
);

/**
 * A date-of-birth check that a plain regex cannot do.
 *
 * `Date.parse('2026-02-30')` rolls over to 2 March rather than failing, so the
 * parsed date is compared back against the input to reject the overflow. UTC is
 * used throughout because the value is a calendar date, not an instant.
 */
export function isRealPastDate(value: string): boolean {
  if (!DOB_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== value) return false;

  return parsed.getTime() <= Date.now();
}

/** "14 March 1998" — a birthday reads as a date, not a timestamp. */
export function formatDob(value: string | undefined): string | null {
  if (!value || !DOB_PATTERN.test(value)) return null;

  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Today as `YYYY-MM-DD` in the device's own timezone, not UTC. */
export function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Builds `YYYY-MM-DD` from calendar parts. `month` is 0-indexed, as in `Date`. */
export function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
