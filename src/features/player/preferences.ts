import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'nepaliko:playerPrefs';

export interface PlayerPrefs {
  /** Start the stream on launch without waiting for a tap. */
  autoplay: boolean;
}

/**
 * Autoplay is on by default.
 *
 * This is a radio app: opening it is the request to listen, and a tap between
 * that and audio is friction with nothing behind it. Anyone who disagrees has
 * one toggle in Settings, and their choice persists across restarts.
 *
 * "On launch" means a cold start only. Returning from the background never
 * restarts the stream — if the listener paused before switching away, it stays
 * paused, which is what the once-only latch in `PlayerProvider` enforces.
 */
export const DEFAULT_PLAYER_PREFS: PlayerPrefs = { autoplay: true };

export async function loadPlayerPrefs(): Promise<PlayerPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PLAYER_PREFS, ...JSON.parse(raw) } : DEFAULT_PLAYER_PREFS;
  } catch {
    // A corrupt blob must not cost the user their player.
    return DEFAULT_PLAYER_PREFS;
  }
}

export async function savePlayerPrefs(prefs: PlayerPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
}
