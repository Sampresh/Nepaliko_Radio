import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius } from '@/theme';

const SIZE = 104;
const RING_WIDTH = 3;

interface Props {
  isPlaying: boolean;
  isConnecting: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function PlayPauseButton({ isPlaying, isConnecting, disabled, onPress }: Props) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isConnecting) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isConnecting, rotation]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  return (
    <View style={styles.wrapper}>
      {isConnecting && <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />}

      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => {
            scale.value = withSpring(0.94, { damping: 15, stiffness: 260 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 260 });
          }}
          disabled={disabled}
          accessibilityRole="button"
          // "Stop", not "Pause": there is no resume for a live stream — the next
          // press reconnects at the live edge.
          accessibilityLabel={isPlaying ? 'Stop radio' : 'Play live radio'}
          accessibilityState={{ disabled: !!disabled, busy: isConnecting }}
          style={[styles.button, disabled && styles.buttonDisabled]}>
          <Ionicons
            name={isPlaying ? 'stop' : 'play'}
            size={44}
            color={Colors.textPrimary}
            // Optical centring: the play triangle reads left-heavy when centred.
            style={isPlaying ? undefined : styles.playIcon}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE + 16,
    height: SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE + 16,
    height: SIZE + 16,
    borderRadius: Radius.full,
    borderWidth: RING_WIDTH,
    borderColor: Colors.border,
    borderTopColor: Colors.primaryBright,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.surface,
  },
  playIcon: {
    marginLeft: 6,
  },
});
