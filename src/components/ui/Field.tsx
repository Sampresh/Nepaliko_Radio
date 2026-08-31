import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/Text';
import { Colors, FontFamily, FontSize, MinTouchTarget, Spacing } from '@/theme';

interface Props extends Omit<TextInputProps, 'style' | 'placeholder'> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  /** Renders the show/hide toggle and starts obscured. */
  secure?: boolean;
}

/**
 * Underlined text field with a label that lifts out of the way on focus.
 *
 * The reference design did this with Tailwind's `peer-placeholder-shown`
 * selector, which has no React Native equivalent — there are no sibling
 * selectors and no `:placeholder-shown`. The same two states (resting inside
 * the field, lifted and shrunk above it) are driven here from focus plus
 * emptiness, which is exactly what that CSS was deriving.
 *
 * The label is `pointerEvents="none"` so a tap that lands on it while it rests
 * over the input still reaches the input underneath.
 */
export const Field = forwardRef<TextInput, Props>(function Field(
  { label, icon, error, secure = false, value, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasContent = !!value;
  const lifted = useDerivedValue(() => withTiming(focused || hasContent ? 1 : 0, { duration: 180 }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lifted.value, [0, 1], [0, -22]) },
      { scale: interpolate(lifted.value, [0, 1], [1, 0.8]) },
    ],
    // Keeps the shrink anchored to the left edge rather than the centre, the
    // RN equivalent of the design's `origin-[0]`.
    transformOrigin: 'left center',
    opacity: interpolate(lifted.value, [0, 1], [0.75, 1]),
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    backgroundColor: error
      ? Colors.warning
      : lifted.value > 0.5 && focused
        ? Colors.primaryBright
        : Colors.border,
    height: focused || error ? 2 : StyleSheet.hairlineWidth,
  }));

  return (
    <View style={styles.root}>
      <View style={styles.inputRow}>
        <Animated.View style={[styles.label, labelStyle]} pointerEvents="none">
          <Ionicons name={icon} size={14} color={Colors.textSecondary} />
          <AppText variant="small" color={Colors.textSecondary}>
            {label}
          </AppText>
        </Animated.View>

        <TextInput
          ref={ref}
          value={value}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          secureTextEntry={secure && !revealed}
          placeholderTextColor={Colors.textSecondary}
          selectionColor={Colors.primaryBright}
          style={styles.input}
          accessibilityLabel={label}
          {...rest}
        />

        {secure && (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={12}
            style={styles.reveal}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      <Animated.View style={[styles.underline, underlineStyle]} />

      {error && (
        <AppText variant="caption" color={Colors.warning} style={styles.error}>
          {error}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    // Leaves room for the lifted label above the field.
    paddingTop: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    minHeight: MinTouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
    color: Colors.textPrimary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
  },
  reveal: {
    paddingLeft: Spacing.sm,
  },
  underline: {
    width: '100%',
  },
  error: {
    marginTop: Spacing.xs,
  },
});
