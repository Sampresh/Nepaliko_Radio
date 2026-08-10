import {
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { SharedValue } from 'react-native-reanimated';

import { useRadioConfig, type RadioConfigState } from '@/features/content/useRadioConfig';
import { DEFAULT_PLAYER_PREFS, loadPlayerPrefs, savePlayerPrefs } from '@/features/player/preferences';
import { useAudioLevels } from '@/features/player/useAudioLevels';

interface PlayerContextValue extends RadioConfigState {
  /** True once audio is actually coming out of the speaker. */
  isPlaying: boolean;
  /** User has tapped play but the stream has not started yet. */
  isConnecting: boolean;
  /** Playback failed on both primary and backup. */
  error: string | null;
  /** False when the station has flipped the `isLive` kill-switch. */
  canPlay: boolean;
  /** True once we have fallen back to `backupStreamUrl`. */
  usingBackup: boolean;
  /** Epoch ms at which the sleep timer stops playback, or null when unset. */
  sleepEndsAt: number | null;
  setSleepTimer: (minutes: number | null) => void;
  /** Whether the stream starts on its own at launch. */
  autoplay: boolean;
  setAutoplay: (enabled: boolean) => void;
  /** Per-bar amplitude of the live audio, 0-1, for the visualiser. */
  levels: SharedValue<number[]>;
  /** True while the bars are riding real PCM rather than the synthetic loop. */
  isSampling: boolean;
  toggle: () => void;
  retry: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const configState = useRadioConfig();
  const { config } = configState;

  const player = useAudioPlayer(null, { updateInterval: 1000 });
  const status = useAudioPlayerStatus(player);

  // "Does the user want audio right now" — distinct from whether it is playing.
  const [wantsPlayback, setWantsPlayback] = useState(false);
  const [usingBackup, setUsingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const [autoplay, setAutoplayState] = useState(DEFAULT_PLAYER_PREFS.autoplay);
  // Null until AsyncStorage answers, so autoplay never fires on a default that
  // the user has actually turned off.
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Refs so the error handler can read current values without re-subscribing.
  const wantsPlaybackRef = useRef(wantsPlayback);
  wantsPlaybackRef.current = wantsPlayback;
  const usingBackupRef = useRef(usingBackup);
  usingBackupRef.current = usingBackup;

  const canPlay = config?.isLive === true;

  const { levels, isSampling } = useAudioLevels(player, status.playing);

  // Configure the audio session once. `doNotMix` is required for lock screen
  // controls to bind to this player.
  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  // Set while we intentionally tear the source down, so the resulting native
  // error is not mistaken for the stream dropping.
  const stoppingRef = useRef(false);
  // Whether audio has actually been heard since the last start. Guards the
  // external-pause detector from firing during the initial connect, when
  // `playing` is legitimately false.
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (status.playing) hasPlayedRef.current = true;
  }, [status.playing]);

  // Failover: primary stream died, so try the backup once before giving up.
  useEffect(() => {
    if (!status.error || stoppingRef.current) return;

    const backupUrl = config?.backupStreamUrl;
    if (!usingBackupRef.current && backupUrl) {
      setUsingBackup(true);
      player.replace({ uri: backupUrl });
      if (wantsPlaybackRef.current) player.play();
      return;
    }

    setError(status.error);
    setWantsPlayback(false);
  }, [status.error, config?.backupStreamUrl, player]);

  /**
   * Connects to the live edge.
   *
   * The source is re-attached on every start, never resumed. A live stream that
   * resumes from a paused buffer plays audio that is minutes stale and drifts
   * further behind with each pause, so "play" has to mean "reconnect now".
   */
  const start = useCallback(() => {
    if (!config?.streamUrl || !canPlay) return;

    // Android 13+ needs this for the media notification, and without that
    // notification the OS stops background playback after ~3 minutes.
    // Deliberately not awaited: the permission dialog must not delay audio.
    if (Platform.OS === 'android') {
      requestNotificationPermissionsAsync().catch(() => {});
    }

    // Registering for lock screen controls is what keeps playback alive in the
    // background — it is not just cosmetic.
    // `artworkUrl` is cast to a java.net.URL natively, which rejects "" outright
    // and takes the whole call down with it — so omit the key unless it has a
    // real value, rather than passing an empty string through.
    player.setActiveForLockScreen(
      true,
      {
        title: config.stationName,
        artist: config.tagline,
        ...(config.logoUrl ? { artworkUrl: config.logoUrl } : {}),
      },
      { isLiveStream: true }
    );

    stoppingRef.current = false;
    hasPlayedRef.current = false;
    setError(null);
    setUsingBackup(false);
    setWantsPlayback(true);
    player.replace({ uri: config.streamUrl });
    player.play();
  }, [config, canPlay, player]);

  /**
   * Stops rather than pauses.
   *
   * The source is deliberately left attached: `replace(null)` is a no-op
   * natively (the Android binding drops any source that maps to a null media
   * item), so there is nothing to gain by calling it. What makes this a stop
   * rather than a pause is that `start` re-attaches the source, so the buffer
   * sitting here is discarded rather than resumed.
   */
  const stop = useCallback(() => {
    stoppingRef.current = true;
    hasPlayedRef.current = false;
    setWantsPlayback(false);
    player.pause();
    // Leaving the transport registered would show a play button that resumes
    // natively, bypassing the reconnect in `start` and playing stale audio.
    try {
      player.clearLockScreenControls();
    } catch {
      // Already torn down — nothing to clear.
    }
  }, [player]);

  const toggle = useCallback(() => {
    if (status.playing || wantsPlayback) {
      stop();
      return;
    }
    start();
  }, [status.playing, wantsPlayback, stop, start]);

  const retry = useCallback(() => start(), [start]);

  // The OS transport paused us from the lock screen or notification shade. Give
  // it the same meaning as the in-app button, so the next play still reconnects
  // instead of resuming a stale buffer.
  useEffect(() => {
    if (!wantsPlayback || !hasPlayedRef.current) return;
    if (status.playing || status.isBuffering) return;
    stop();
  }, [wantsPlayback, status.playing, status.isBuffering, stop]);

  // ── Autoplay on launch ────────────────────────────────────────────────────
  // Fires once per app session, as soon as we know both the stream URL and the
  // user's preference. The ref (not state) is what makes it once-only: it must
  // not re-arm when the config listener pushes an update, or pausing would be
  // undone by the next snapshot.
  //
  // Declared after `start` on purpose — a dep array referencing it any earlier
  // would evaluate before the `const` is initialised.
  const hasAutoplayed = useRef(false);

  useEffect(() => {
    if (hasAutoplayed.current) return;
    // Browsers reject play() without a user gesture, and the rejection would
    // surface as a bogus "could not connect" error. Let web users tap.
    if (Platform.OS === 'web') return;
    if (!prefsLoaded || !autoplay) return;
    if (!config?.streamUrl || !canPlay) return;
    // The user beat us to the button; leave their intent alone.
    if (wantsPlaybackRef.current) return;

    hasAutoplayed.current = true;
    start();
  }, [prefsLoaded, autoplay, config?.streamUrl, canPlay, start]);

  useEffect(() => {
    loadPlayerPrefs().then((prefs) => {
      setAutoplayState(prefs.autoplay);
      setPrefsLoaded(true);
    });
  }, []);

  const setAutoplay = useCallback((enabled: boolean) => {
    setAutoplayState(enabled);
    savePlayerPrefs({ autoplay: enabled });
  }, []);

  // Sleep timer: a single timeout, re-armed whenever the deadline changes.
  useEffect(() => {
    if (sleepEndsAt === null) return;

    const remaining = sleepEndsAt - Date.now();
    if (remaining <= 0) {
      setSleepEndsAt(null);
      return;
    }

    const timeout = setTimeout(() => {
      player.pause();
      setWantsPlayback(false);
      setSleepEndsAt(null);
    }, remaining);

    return () => clearTimeout(timeout);
  }, [sleepEndsAt, player]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepEndsAt(minutes === null ? null : Date.now() + minutes * 60_000);
  }, []);

  // Drop lock screen controls when the player goes away.
  useEffect(() => {
    return () => {
      // Races `useAudioPlayer`'s own release: if the shared object went first,
      // the native call gets a stale id and rejects. Fast Refresh hits this
      // every reload, so swallow it rather than log a teardown error.
      try {
        player.clearLockScreenControls();
      } catch {
        // Player already released.
      }
    };
  }, [player]);

  const value: PlayerContextValue = {
    ...configState,
    isPlaying: status.playing,
    isConnecting: wantsPlayback && !status.playing && !error,
    error,
    canPlay,
    usingBackup,
    sleepEndsAt,
    setSleepTimer,
    autoplay,
    setAutoplay,
    levels,
    isSampling,
    toggle,
    retry,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside a PlayerProvider');
  return context;
}
