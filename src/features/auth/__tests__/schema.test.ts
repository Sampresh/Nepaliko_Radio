import {
  PASSWORD_MIN,
  authErrorMessage,
  resetSchema,
  signInSchema,
  signUpSchema,
} from '@/features/auth/schema';

describe('signUpSchema', () => {
  const valid = {
    name: 'Sita Karki',
    email: 'sita@example.com',
    password: 'a-good-password',
    phone: '+977 9801234567',
    address: 'Lakeside, Pokhara',
    dob: '1998-03-14',
  };

  it('accepts a fully filled signup', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts blank contact details, since only the credentials are required', () => {
    expect(signUpSchema.safeParse({ ...valid, phone: '', address: '', dob: '' }).success).toBe(
      true
    );
  });

  it('still requires the credentials themselves', () => {
    expect(signUpSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('matches the password floor Firebase itself enforces', () => {
    // Anything shorter is refused server-side with an opaque
    // `auth/weak-password`, so the form has to catch it first.
    expect(signUpSchema.safeParse({ ...valid, password: 'a'.repeat(PASSWORD_MIN) }).success).toBe(
      true
    );
    expect(
      signUpSchema.safeParse({ ...valid, password: 'a'.repeat(PASSWORD_MIN - 1) }).success
    ).toBe(false);
  });

  it('validates the contact details on the same terms as the profile sheet', () => {
    expect(signUpSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, dob: '14/03/1998' }).success).toBe(false);
    // A date that a regex would accept but the calendar could never produce.
    expect(signUpSchema.safeParse({ ...valid, dob: '2001-02-30' }).success).toBe(false);
  });

  it('rejects a date of birth in the future', () => {
    const nextYear = new Date().getUTCFullYear() + 1;
    expect(signUpSchema.safeParse({ ...valid, dob: `${nextYear}-01-01` }).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('does not impose a length floor on an existing password', () => {
    // Sign-in must accept whatever the account already has. Applying the signup
    // minimum here would lock out anyone whose password predates it.
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('still requires both fields', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: '', password: 'whatever' }).success).toBe(false);
  });
});

describe('resetSchema', () => {
  it('takes an email and nothing else', () => {
    expect(resetSchema.safeParse({ email: 'sita@example.com' }).success).toBe(true);
    expect(resetSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('trims, so a keyboard-inserted trailing space still resolves', () => {
    expect(resetSchema.parse({ email: ' sita@example.com ' }).email).toBe('sita@example.com');
  });
});

describe('authErrorMessage', () => {
  it('does not distinguish an unknown email from a wrong password', () => {
    // Email enumeration protection collapses both into one code, and the copy
    // has to stay ambiguous or it leaks which addresses hold accounts.
    expect(authErrorMessage('auth/user-not-found')).toBe(authErrorMessage('auth/wrong-password'));
  });

  it('falls back to something readable for an unmapped code', () => {
    expect(authErrorMessage('auth/something-new')).toBe('Something went wrong. Please try again.');
  });
});
