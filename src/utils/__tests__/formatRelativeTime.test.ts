import { formatRelativeTime } from '../formatRelativeTime';

const NOW = new Date('2026-08-11T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('returns an empty string for missing values', () => {
    expect(formatRelativeTime(null, NOW)).toBe('');
    expect(formatRelativeTime(undefined, NOW)).toBe('');
  });

  it('formats a real Date across each bucket', () => {
    expect(formatRelativeTime(new Date('2026-08-11T11:59:30.000Z'), NOW)).toBe('just now');
    expect(formatRelativeTime(new Date('2026-08-11T11:40:00.000Z'), NOW)).toBe('20m ago');
    expect(formatRelativeTime(new Date('2026-08-11T09:00:00.000Z'), NOW)).toBe('3h ago');
    expect(formatRelativeTime(new Date('2026-08-09T12:00:00.000Z'), NOW)).toBe('2d ago');
  });

  it('treats a future date as scheduled', () => {
    expect(formatRelativeTime(new Date('2026-08-12T12:00:00.000Z'), NOW)).toBe('scheduled');
  });

  /**
   * The regression that crashed the News screen. The persisted React Query
   * cache is plain JSON, so `Post.publishedAt` comes back as an ISO string
   * even though its type says `Date`. Calling `.getTime()` on that threw
   * "undefined is not a function" and took down every PostCard on cold start.
   */
  it('accepts an ISO string, as rehydrated from the persisted cache', () => {
    expect(() => formatRelativeTime('2026-08-11T09:00:00.000Z', NOW)).not.toThrow();
    expect(formatRelativeTime('2026-08-11T09:00:00.000Z', NOW)).toBe('3h ago');
    expect(formatRelativeTime('2026-08-11T11:40:00.000Z', NOW)).toBe('20m ago');
  });

  it('accepts epoch millis', () => {
    expect(formatRelativeTime(new Date('2026-08-11T09:00:00.000Z').getTime(), NOW)).toBe('3h ago');
  });

  it('returns an empty string rather than "Invalid Date" for junk input', () => {
    expect(formatRelativeTime('not a date', NOW)).toBe('');
    expect(formatRelativeTime(Number.NaN, NOW)).toBe('');
  });

  it('falls back to an absolute date beyond a week, without throwing', () => {
    const old = formatRelativeTime('2026-06-01T12:00:00.000Z', NOW);
    expect(old).not.toBe('');
    expect(old).not.toContain('Invalid');
  });
});
