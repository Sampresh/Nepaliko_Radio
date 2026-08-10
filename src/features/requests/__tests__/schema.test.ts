import { MESSAGE_MAX, NAME_MAX, requestSchema } from '@/features/requests/schema';

const valid = {
  type: 'song' as const,
  name: 'Sita',
  message: 'Please play a Narayan Gopal song.',
  contact: '',
};

describe('requestSchema', () => {
  it('accepts a well-formed request', () => {
    expect(requestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(requestSchema.safeParse({ ...valid, type: 'spam' }).success).toBe(false);
  });

  it('rejects an empty name or message', () => {
    expect(requestSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(requestSchema.safeParse({ ...valid, message: '' }).success).toBe(false);
  });

  it('enforces the same lengths as the Firestore rule', () => {
    expect(requestSchema.safeParse({ ...valid, name: 'a'.repeat(NAME_MAX) }).success).toBe(true);
    expect(requestSchema.safeParse({ ...valid, name: 'a'.repeat(NAME_MAX + 1) }).success).toBe(
      false
    );
    expect(
      requestSchema.safeParse({ ...valid, message: 'a'.repeat(MESSAGE_MAX) }).success
    ).toBe(true);
    expect(
      requestSchema.safeParse({ ...valid, message: 'a'.repeat(MESSAGE_MAX + 1) }).success
    ).toBe(false);
  });

  it('treats contact as optional', () => {
    expect(requestSchema.safeParse({ ...valid, contact: undefined }).success).toBe(true);
    expect(requestSchema.safeParse({ ...valid, contact: 'sita@example.com' }).success).toBe(true);
  });
});
