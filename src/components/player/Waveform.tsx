import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { usePlayer } from '@/features/player/PlayerProvider';
import { BAR_COUNT } from '@/features/player/useAudioLevels';
import { Colors, Radius } from '@/theme';

const MAX_HEIGHT = 44;
const MIN_HEIGHT = 4;
const SPAN = MAX_HEIGHT - MIN_HEIGHT;
/** Roughly one sample interval — long enough to hide the ~10Hz update rate. */
const FOLLOW_MS = 110;

/**
 * Per-bar shape for the synthetic fallback. Deterministic rather than random so
 * the wave looks the same on every launch, with a bell curve across the row so
 * the centre bars lead and the edges trail.
 */
const SYNTHETIC = Array.from({ length: BAR_COUNT }, (_, i) => {
  const bell = Math.sin((Math.PI * i) / (BAR_COUNT - 1));
  return {
    peak: MIN_HEIGHT + SPAN * (0.25 + 0.75 * bell) * 0.8,
    duration: 380 + ((i * 137) % 260),
    delay: (i * 61) % 320,
  };
});

/** One bar driven by real PCM amplitude. */
function LevelBar({ levels, index }: { levels: SharedValue<number[]>; index: number }) {
  const style = useAnimatedStyle(() => {
    const level = levels.value[index] ?? 0;
    return {
      height: withTiming(MIN_HEIGHT + level * SPAN, {
        duration: FOLLOW_MS,
        easing: Easing.out(Easing.quad),
      }),
      opacity: withTiming(0.4 + level * 0.6, { duration: FOLLOW_MS }),
    };
  });

  return <Animated.View style={[styles.bar, style]} />;
}

/** One bar on the synthetic loop, used when no samples are available. */
function SyntheticBar({ active, index }: { active: boolean; index: number }) {
  const { peak, duration, delay } = SYNTHETIC[index];
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (!active) {
      cancelAnimation(height);
      height.value = withTiming(MIN_HEIGHT, { duration: 220 });
      return;
    }

    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(peak, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(MIN_HEIGHT + SPAN * 0.08, { duration, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [active, peak, duration, delay, height]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    opacity: 0.4 + ((height.value - MIN_HEIGHT) / SPAN) * 0.6,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

/**
 * Mirrored bar visualiser.
 *
 * Bars are centre-anchored (the row centres them), so growing the height alone
 * expands each bar symmetrically above and below the midline — no second set of
 * mirrored views to keep in sync.
 *
 * Rides real audio when `isSampling`, otherwise runs the synthetic loop so the
 * player never looks dead on a device that denied the permission.
 */
export function Waveform({ active }: { active: boolean }) {
  const { levels, isSampling } = usePlayer();
  const live = active && isSampling;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: BAR_COUNT }, (_, index) =>
        live ? (
          <LevelBar key={index} levels={levels} index={index} />
        ) : (
          <SyntheticBar key={index} active={active} index={index} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: MAX_HEIGHT,
  },
  bar: {
    width: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBright,
  },
});
