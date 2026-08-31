import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/theme';

/**
 * The drifting backdrop behind the auth screens.
 *
 * The reference design drove this with a WebGL fragment shader. React Native
 * has no canvas, and the faithful port (`expo-gl`) is a native module, which
 * would mean recompiling the dev build for one decorative screen. Two oversized
 * gradient blobs on long, mismatched loops read the same at a glance — slow
 * coloured light moving behind glass — for zero new dependencies.
 *
 * The loop durations are deliberately coprime (19s / 23s / 31s): equal or
 * harmonic periods would visibly resynchronise every few cycles and the motion
 * would start to look like a repeating GIF.
 *
 * Colours are the station's, not the reference's blue — this screen is the
 * first thing a listener sees and it should look like the rest of the app.
 */

const BLOB_ONE: readonly [string, string, string] = ['#B71C1C', '#7A1212', 'transparent'];
const BLOB_TWO: readonly [string, string, string] = ['#E53935', '#3E0A0A', 'transparent'];

export function AuthBackground() {
  const { width, height } = useWindowDimensions();
  // Oversized so the blobs can drift well past the edges without exposing a
  // hard boundary. The largest axis drives both, keeping them circular.
  const size = Math.max(width, height) * 1.1;

  const drift = useSharedValue(0);
  const sway = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const loop = (value: typeof drift, duration: number) => {
      value.value = withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    };

    loop(drift, 19_000);
    loop(sway, 23_000);
    loop(pulse, 31_000);
  }, [drift, sway, pulse]);

  const one = useAnimatedStyle(() => ({
    transform: [
      { translateX: -size * 0.25 + drift.value * size * 0.3 },
      { translateY: -size * 0.3 + sway.value * size * 0.2 },
      { scale: 0.9 + pulse.value * 0.25 },
    ],
    opacity: 0.5 + pulse.value * 0.2,
  }));

  const two = useAnimatedStyle(() => ({
    transform: [
      { translateX: width - size * 0.55 - sway.value * size * 0.25 },
      { translateY: height - size * 0.75 - drift.value * size * 0.2 },
      { scale: 1.05 - pulse.value * 0.2 },
    ],
    opacity: 0.4 + (1 - pulse.value) * 0.2,
  }));

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[{ width: size, height: size }, styles.blob, one]}>
        <LinearGradient
          colors={BLOB_ONE}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[{ width: size, height: size }, styles.blob, two]}>
        <LinearGradient
          colors={BLOB_TWO}
          start={{ x: 1, y: 0.1 }}
          end={{ x: 0.1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/*
        Stands in for the shader's `backdrop-blur`. A real blur (expo-blur) over
        a full-screen animated layer is expensive on mid-range Android, which is
        most of this station's audience; a dark scrim costs nothing and does the
        same job of pushing the colour back behind the form.
      */}
      <View style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 11, 0.55)',
  },
});
