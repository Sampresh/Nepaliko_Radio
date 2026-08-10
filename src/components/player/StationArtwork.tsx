import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/Text';
import { stationInitials } from '@/config/station';
import { Colors, Radius } from '@/theme';

const SIZE = 244;
/** Logo sits inside both rings with breathing room. */
const LOGO_SIZE = SIZE - 46;
const SWEEP_MS = 9000;
const COUNTER_MS = 14000;

interface Props {
  logoUrl?: string;
  stationName: string;
  /** Rings only move while audio is actually playing. */
  active: boolean;
  levels: SharedValue<number[]>;
}

/**
 * The player's centrepiece: a static station logo inside two sweeping rings.
 *
 * The logo deliberately does not rotate. Station logos are typographic, and
 * spinning type is unreadable — the motion lives in the rings instead, which
 * gives the same "it's live" feel without sacrificing legibility.
 */
export function StationArtwork({ logoUrl, stationName, active, levels }: Props) {
  const sweep = useSharedValue(0);
  const counter = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(sweep);
      cancelAnimation(counter);
      // Ease back to rest instead of snapping, which would read as a glitch.
      sweep.value = withTiming(sweep.value % 360, { duration: 400 });
      return;
    }

    sweep.value = withRepeat(
      withTiming(sweep.value + 360, { duration: SWEEP_MS, easing: Easing.linear }),
      -1,
      false
    );
    counter.value = withRepeat(
      withTiming(counter.value - 360, { duration: COUNTER_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [active, sweep, counter]);

  /** Mean amplitude across the bars, computed on the UI thread. */
  const energy = () => {
    'worklet';
    const values = levels.value;
    if (!values.length) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    return sum / values.length;
  };

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value}deg` }, { scale: 1 + energy() * 0.05 }],
  }));

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${counter.value}deg` }],
    opacity: 0.35 + energy() * 0.65,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + energy() * 0.3,
    transform: [{ scale: 1 + energy() * 0.08 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Animated.View style={[styles.sweepRing, sweepStyle]} pointerEvents="none" />
      <Animated.View style={[styles.counterRing, counterStyle]} pointerEvents="none" />

      <View style={styles.logoWrap}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            contentFit="cover"
            transition={260}
            accessibilityLabel={`${stationName} logo`}
          />
        ) : (
          <View style={styles.monogram} accessibilityLabel={`${stationName} logo`}>
            <AppText weight="bold" style={styles.monogramText}>
              {stationInitials(stationName)}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  // Two transparent borders leave a gap in the ring, so rotation is visible.
  // Red outer, white inner: the identity is red / white / black, so the two
  // rings read as distinct rather than as two shades of the same red.
  sweepRing: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.full,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: Colors.primaryBright,
    borderRightColor: Colors.primary,
  },
  counterRing: {
    position: 'absolute',
    width: SIZE - 18,
    height: SIZE - 18,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.75)',
    borderLeftColor: 'rgba(255, 255, 255, 0.14)',
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  monogram: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  monogramText: {
    fontSize: 76,
    lineHeight: 90,
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
});
