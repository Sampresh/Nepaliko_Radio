import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * When to offer the sign-in sheet.
 *
 * The rules exist to keep an optional account feeling optional. A prompt on
 * first launch, before anyone has heard a second of radio, is the version of
 * this that gets an app deleted — so it waits until someone has actually
 * listened, backs off for a week when dismissed, and gives up entirely after
 * three.
 *
 * Counters live in AsyncStorage rather than Firestore: this is a per-install
 * nudge, it must work signed out, and it is not worth a network round trip.
 */

const KEY = 'nepaliko:signInPrompt';

/** Cumulative listening before the sheet may appear. */
export const LISTEN_THRESHOLD_MS = 2 * 60_000;
/** Or this many app opens, whichever lands first. */
export const OPEN_THRESHOLD = 3;
/** Silence after a dismissal. */
const SNOOZE_MS = 7 * 24 * 60 * 60_000;
/** After this many showings, never again. */
const MAX_SHOWINGS = 3;

export interface PromptState {
  /** Cold starts so far, including the current one. */
  opens: number;
  /** Cumulative milliseconds of playback across all sessions. */
  listenedMs: number;
  /** How many times the sheet has been shown. */
  shown: number;
  /** Epoch ms of the last dismissal, or null. */
  dismissedAt: number | null;
  /** Set once the listener signs in, so it never returns for this install. */
  done: boolean;
}

const EMPTY: PromptState = {
  opens: 0,
  listenedMs: 0,
  shown: 0,
  dismissedAt: null,
  done: false,
};

export async function loadPromptState(): Promise<PromptState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    // A corrupt blob should mean "start over quietly", never a crash on launch.
    return EMPTY;
  }
}

async function save(state: PromptState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

/** Counts a cold start. Called once per launch. */
export async function recordOpen(): Promise<PromptState> {
  const state = await loadPromptState();
  const next = { ...state, opens: state.opens + 1 };
  await save(next);
  return next;
}

/** Adds to the listening total. Called when playback stops or the app backgrounds. */
export async function recordListening(ms: number): Promise<PromptState> {
  if (ms <= 0) return loadPromptState();

  const state = await loadPromptState();
  const next = { ...state, listenedMs: state.listenedMs + ms };
  await save(next);
  return next;
}

export async function recordShown(): Promise<void> {
  const state = await loadPromptState();
  await save({ ...state, shown: state.shown + 1 });
}

export async function recordDismissed(): Promise<void> {
  const state = await loadPromptState();
  await save({ ...state, dismissedAt: Date.now() });
}

/** Called after a successful sign-in, so the sheet never comes back. */
export async function recordSignedIn(): Promise<void> {
  const state = await loadPromptState();
  await save({ ...state, done: true });
}

/**
 * The whole decision, in one place so it can be reasoned about and tested
 * without mounting anything.
 */
export function shouldPrompt(state: PromptState, now: number = Date.now()): boolean {
  if (state.done) return false;
  if (state.shown >= MAX_SHOWINGS) return false;
  if (state.dismissedAt !== null && now - state.dismissedAt < SNOOZE_MS) return false;

  // Never on the first launch, whatever the other counters say — `opens` is
  // incremented before this runs, so the opening launch is 1.
  if (state.opens <= 1) return false;

  return state.listenedMs >= LISTEN_THRESHOLD_MS || state.opens >= OPEN_THRESHOLD;
}
