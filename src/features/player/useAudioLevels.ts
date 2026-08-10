import { requestRecordingPermissionsAsync, type AudioPlayer, type AudioSample } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/** Bars in the visualiser. Each one is a moment in time, newest on the right. */
export const BAR_COUNT = 32;

const IDLE: number[] = new Array(BAR_COUNT).fill(0);

/** How quickly the running average follows the signal. Lower = steadier baseline. */
const MEAN_FOLLOW = 0.08;
/** Height the bars sit at when the audio is exactly at its average loudness. */
const BASELINE = 0.42;
/** How far a given deviation from average swings the bars. */
const SENSITIVITY = 1.15;
/** Below this RMS the stream is silent — collapse the bars rather than amplify noise. */
const SILENCE = 0.005;
/** Ignore samples arriving faster than ~30fps; the UI cannot show them anyway. */
const MIN_FRAME_MS = 33;

export interface AudioLevels {
  /** Per-bar amplitude, 0-1, updated off the JS thread by Reanimated. */
  levels: SharedValue<number[]>;
  /** True only while real PCM samples are arriving. */
  isSampling: boolean;
}

/**
 * Turns the player's PCM stream into per-bar amplitudes for the visualiser.
 *
 * Levels live in a Reanimated shared value rather than React state on purpose:
 * samples land ~10-20 times a second, and re-rendering the tree at that rate
 * would drop frames on exactly the mid-range devices this app targets.
 *
 * Falls back silently — callers should render a synthetic wave when
 * `isSampling` is false, which covers web, denied permission, and any device
 * where the platform reports no sampling support.
 */
export function useAudioLevels(player: AudioPlayer, active: boolean): AudioLevels {
  const levels = useSharedValue<number[]>(IDLE);
  const [isSampling, setIsSampling] = useState(false);

  // Rolling window of recent amplitudes — oldest at index 0. Has to survive
  // across samples but must never trigger a render, so it lives in a ref.
  const history = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const meanLevel = useRef(0);
  const lastFrameAt = useRef(0);

  useEffect(() => {
    if (!active || !player.isAudioSamplingSupported) {
      levels.value = IDLE;
      setIsSampling(false);
      return;
    }

    let cancelled = false;
    let subscription: { remove: () => void } | undefined;

    function onSample(sample: AudioSample) {
      const now = Date.now();
      if (now - lastFrameAt.current < MIN_FRAME_MS) return;
      lastFrameAt.current = now;

      const frames = sample.channels[0]?.frames;
      if (!frames?.length) return;

      // One amplitude for the whole buffer, not one per bar.
      //
      // Splitting a single ~23ms buffer across the bars looks wrong: over that
      // little time the signal barely changes, so every bar lands on the same
      // height and the row reads as a solid block. Carving it into frequency
      // bands instead would need an FFT. So each bar is a *moment* rather than
      // a band, and the row scrolls — which is also what the reference shows.
      let sum = 0;
      for (let i = 0; i < frames.length; i++) sum += frames[i] * frames[i];
      const rms = Math.sqrt(sum / frames.length);

      // Plot deviation from the running average, not absolute loudness.
      //
      // On-air processing compresses and limits broadcast audio on purpose, so
      // absolute level barely moves — normalising against a peak pins every bar
      // to full height and the row reads as a solid block. Against a moving
      // average, the quiet and loud moments still separate.
      const previousMean = meanLevel.current;
      meanLevel.current =
        previousMean === 0 ? rms : previousMean + (rms - previousMean) * MEAN_FOLLOW;

      const mean = Math.max(meanLevel.current, 1e-4);
      const level =
        rms < SILENCE
          ? 0.04
          : Math.min(1, Math.max(0.05, BASELINE + ((rms - mean) / mean) * SENSITIVITY));

      // Scroll left, newest sample on the right.
      const recent = history.current;
      recent.copyWithin(0, 1);
      recent[BAR_COUNT - 1] = level;

      // A fresh array each time — Reanimated diffs by reference, so mutating
      // the history in place would never reach the UI thread.
      levels.value = recent.slice();
    }

    (async () => {
      // Android implements sampling with the system Visualizer effect, which is
      // gated on RECORD_AUDIO. Without the grant `setAudioSamplingEnabled` is a
      // silent no-op, so ask before enabling rather than after.
      if (Platform.OS === 'android') {
        const granted = await requestRecordingPermissionsAsync()
          .then((result) => result.granted)
          .catch(() => false);
        if (!granted || cancelled) return;
      }

      player.setAudioSamplingEnabled(true);
      subscription = player.addListener('audioSampleUpdate', onSample);
      if (!cancelled) setIsSampling(true);
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      player.setAudioSamplingEnabled(false);
      history.current.fill(0);
      meanLevel.current = 0;
      lastFrameAt.current = 0;
      levels.value = IDLE;
      setIsSampling(false);
    };
  }, [player, active, levels]);

  return { levels, isSampling };
}
