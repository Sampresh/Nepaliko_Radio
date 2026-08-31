import {
  LISTEN_THRESHOLD_MS,
  OPEN_THRESHOLD,
  shouldPrompt,
  type PromptState,
} from '@/features/auth/signInPrompt';

const base: PromptState = {
  opens: 1,
  listenedMs: 0,
  shown: 0,
  dismissedAt: null,
  done: false,
};

const DAY = 24 * 60 * 60_000;

describe('shouldPrompt', () => {
  it('never fires on the first launch', () => {
    // The single rule most worth keeping: a sign-up wall before anyone has
    // heard a second of radio is the version of this that gets an app deleted.
    expect(shouldPrompt({ ...base, opens: 1, listenedMs: LISTEN_THRESHOLD_MS * 10 })).toBe(false);
  });

  it('fires once enough listening has accumulated', () => {
    expect(shouldPrompt({ ...base, opens: 2, listenedMs: LISTEN_THRESHOLD_MS })).toBe(true);
  });

  it('does not fire just short of the listening threshold', () => {
    expect(shouldPrompt({ ...base, opens: 2, listenedMs: LISTEN_THRESHOLD_MS - 1 })).toBe(false);
  });

  it('fires on the third open even with no listening', () => {
    expect(shouldPrompt({ ...base, opens: OPEN_THRESHOLD, listenedMs: 0 })).toBe(true);
  });

  it('stays quiet for a week after a dismissal', () => {
    const now = Date.now();
    const dismissed = { ...base, opens: 5, listenedMs: LISTEN_THRESHOLD_MS, dismissedAt: now };

    expect(shouldPrompt(dismissed, now + 6 * DAY)).toBe(false);
    expect(shouldPrompt(dismissed, now + 7 * DAY + 1)).toBe(true);
  });

  it('gives up after three showings', () => {
    const ready = { ...base, opens: 9, listenedMs: LISTEN_THRESHOLD_MS };
    expect(shouldPrompt({ ...ready, shown: 2 })).toBe(true);
    expect(shouldPrompt({ ...ready, shown: 3 })).toBe(false);
    expect(shouldPrompt({ ...ready, shown: 99 })).toBe(false);
  });

  it('never fires again once the listener has signed in', () => {
    expect(
      shouldPrompt({ ...base, opens: 9, listenedMs: LISTEN_THRESHOLD_MS, done: true })
    ).toBe(false);
  });

  it('treats the thresholds as an either/or, not a both', () => {
    // Plenty of listening but only the second open.
    expect(shouldPrompt({ ...base, opens: 2, listenedMs: LISTEN_THRESHOLD_MS })).toBe(true);
    // Plenty of opens but no listening.
    expect(shouldPrompt({ ...base, opens: OPEN_THRESHOLD + 4, listenedMs: 0 })).toBe(true);
  });
});
