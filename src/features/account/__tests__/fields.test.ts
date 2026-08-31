import { formatDob, isRealPastDate, toIso, todayIso } from '@/features/account/fields';

describe('toIso', () => {
  it('zero-pads month and day so the value is always 10 characters', () => {
    // The Firestore rule asserts `dob.size() == 10`, so "1998-3-4" would be
    // rejected server-side even though it parses fine as a date.
    expect(toIso(1998, 2, 4)).toBe('1998-03-04');
    expect(toIso(1998, 2, 4)).toHaveLength(10);
  });

  it('treats month as 0-indexed, matching Date', () => {
    expect(toIso(2001, 0, 1)).toBe('2001-01-01');
    expect(toIso(2001, 11, 31)).toBe('2001-12-31');
  });
});

describe('todayIso', () => {
  it('produces a well-formed date that is not in the future', () => {
    const today = todayIso();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isRealPastDate(today)).toBe(true);
  });

  it('uses the local calendar day rather than UTC', () => {
    // Built from local getFullYear/getMonth/getDate on purpose: a UTC-derived
    // "today" is the previous day for anyone west of Greenwich in the evening,
    // which would render the calendar's last row unselectable.
    const now = new Date();
    expect(todayIso()).toBe(toIso(now.getFullYear(), now.getMonth(), now.getDate()));
  });
});

describe('isRealPastDate', () => {
  it('accepts the boundary days of a leap February', () => {
    expect(isRealPastDate('2000-02-29')).toBe(true);
    expect(isRealPastDate('1900-02-29')).toBe(false);
  });

  it('rejects month and day overflow that Date silently rolls over', () => {
    expect(isRealPastDate('2001-02-30')).toBe(false);
    expect(isRealPastDate('2001-00-10')).toBe(false);
    expect(isRealPastDate('2001-13-01')).toBe(false);
    expect(isRealPastDate('2001-04-31')).toBe(false);
  });
});

describe('formatDob', () => {
  it('does not shift the date across time zones', () => {
    // The guarded bug is a birthday rendering as the previous day west of UTC,
    // which is what a naive `new Date(value)` plus local formatting would do.
    const formatted = formatDob('1998-03-14');
    expect(formatted).toContain('14');
    expect(formatted).toContain('1998');
    expect(formatted).not.toContain('13');
  });

  it('returns null rather than throwing on junk', () => {
    expect(formatDob('')).toBeNull();
    expect(formatDob(undefined)).toBeNull();
    expect(formatDob('1998-3-14')).toBeNull();
  });
});
