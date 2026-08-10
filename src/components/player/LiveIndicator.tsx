import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, FontSize, Radius, Spacing } from '@/theme';

interface Props {
  /** The station's `isLive` flag, not whether audio is currently playing. */
  isLive: boolean;
  label?: string;
}

export function LiveIndicator({ isLive, label }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isLive) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        false
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
  }, [isLive, opacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const color = isLive ? Colors.live : Colors.warning;

  return (
    <View style={styles.pill} accessibilityRole="text">
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      <Text style={[styles.label, { color }]}>{label ?? (isLive ? 'LIVE' : 'OFF AIR')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
