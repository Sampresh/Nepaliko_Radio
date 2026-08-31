const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Anything a call site might hand us in place of a date.
 *
 * `Post.publishedAt` is typed `Date`, but that only holds for data straight off
 * the wire. The React Query cache is persisted to AsyncStorage as plain JSON,
 * so a Date dehydrates to an ISO string and rehydrates as one — the type still
 * claims `Date` while the value is a `string`. Calling `.getTime()` on that
 * throws "undefined is not a function" and takes the whole News screen down on
 * every cold start that has cached posts.
 */
export type DateLike = Date | string | number | null | undefined;

/** Coerces to a real Date, or null when the value cannot produce a valid one. */
function toDate(value: DateLike): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Compact relative time for feed cards: "just now", "3h ago", "12 Aug". */
export function formatRelativeTime(value: DateLike, now: Date = new Date()): string {
  const date = toDate(value);
  if (!date) return '';

  const diff = now.getTime() - date.getTime();
  if (diff < 0) return 'scheduled';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
