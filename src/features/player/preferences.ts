import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'nepaliko:playerPrefs';

export interface PlayerPrefs {
  /** Start the stream on launch without waiting for a tap. */
  autoplay: boolean;
}

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
