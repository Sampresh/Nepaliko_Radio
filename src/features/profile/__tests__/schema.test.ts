import {
  ADDRESS_MAX,
  PHONE_MAX,
  formatDob,
  isRealPastDate,
  profileDetailsSchema,
} from '@/features/profile/schema';

const valid = {
  name: 'Sita Karki',
  phone: '+977 9801234567',
  address: 'Lakeside, Pokhara',
  dob: '1998-03-14',
};

describe('profileDetailsSchema', () => {
  it('accepts a fully filled profile', () => {
    expect(profileDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a profile with only a name, since the extras are optional', () => {
    const parsed = profileDetailsSchema.safeParse({
      name: 'Sita',
      phone: '',
      address: '',
      dob: '',
    });
    expect(parsed.success).toBe(true);
  });

  it('requires a name', () => {
    expect(profileDetailsSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  it('trims what it stores, so a padded value is not saved with its spaces', () => {
    const parsed = profileDetailsSchema.parse({ ...valid, address: '  Pokhara  ' });
    expect(parsed.address).toBe('Pokhara');
  });

  it('enforces the same lengths as the Firestore rule', () => {
    expect(profileDetailsSchema.safeParse({ ...valid, phone: '9'.repeat(PHONE_MAX) }).success).toBe(
      true
    );
    expect(
      profileDetailsSchema.safeParse({ ...valid, phone: '9'.repeat(PHONE_MAX + 1) }).success
    ).toBe(false);
    expect(
      profileDetailsSchema.safeParse({ ...valid, address: 'a'.repeat(ADDRESS_MAX) }).success
    ).toBe(true);
    expect(
      profileDetailsSchema.safeParse({ ...valid, address: 'a'.repeat(ADDRESS_MAX + 1) }).success
    ).toBe(false);
  });

  it('rejects a phone number made of letters', () => {
    expect(profileDetailsSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false);
  });

  it('rejects a date of birth that is not YYYY-MM-DD', () => {
    expect(profileDetailsSchema.safeParse({ ...valid, dob: '14/03/1998' }).success).toBe(false);
    expect(profileDetailsSchema.safeParse({ ...valid, dob: '1998-3-4' }).success).toBe(false);
  });
});

describe('isRealPastDate', () => {
  it('accepts a real past date', () => {
    expect(isRealPastDate('1998-03-14')).toBe(true);
  });

  it('rejects a day that does not exist in that month', () => {
    // Date.parse rolls 30 February over to 2 March rather than failing, so this
    // is the case a regex alone would let through.
    expect(isRealPastDate('2001-02-30')).toBe(false);
    expect(isRealPastDate('2001-13-01')).toBe(false);
  });

  it('rejects a date in the future', () => {
    const nextYear = new Date().getUTCFullYear() + 1;
    expect(isRealPastDate(`${nextYear}-01-01`)).toBe(false);
  });
});

describe('formatDob', () => {
  it('renders the stored date without shifting it across time zones', () => {
    // The bug this guards is a birthday rendering as the previous day for
    // anyone west of UTC, which is what a naive `new Date(value)` would do.
    expect(formatDob('1998-03-14')).toContain('1998');
    expect(formatDob('1998-03-14')).toContain('14');
  });

  it('returns null for a missing or malformed value', () => {
    expect(formatDob(undefined)).toBeNull();
    expect(formatDob('')).toBeNull();
    expect(formatDob('not a date')).toBeNull();
  });
});
