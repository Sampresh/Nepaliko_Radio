import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { Calendar } from '@/components/ui/Calendar';
import { AppText } from '@/components/ui/Text';
import { formatDob } from '@/features/account/fields';
import { Colors, FontSize, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * A read-only field that opens the calendar.
 *
 * Deliberately not a `TextInput`: typing a date invites `14/03/98`, `March 14`
 * and every other shape a parser then has to guess at, and the stored value has
 * to be exactly `YYYY-MM-DD` for the Firestore rule to accept it. Picking is
 * the only input path, so the value cannot be malformed.
 *
 * The label animation mirrors `Field` so the two read as one form rather than
 * two components that happen to sit next to each other.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  /** `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  const hasContent = !!value;
  const lifted = useDerivedValue(() => withTiming(hasContent ? 1 : 0, { duration: 180 }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lifted.value, [0, 1], [0, -22]) },
      { scale: interpolate(lifted.value, [0, 1], [1, 0.8]) },
    ],
    transformOrigin: 'left center',
    opacity: interpolate(lifted.value, [0, 1], [0.75, 1]),
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    backgroundColor: error ? Colors.warning : Colors.border,
    height: error ? 2 : StyleSheet.hairlineWidth,
  }));

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}, ${formatDob(value) ?? value}` : label}
        style={styles.inputRow}>
        <Animated.View style={[styles.label, labelStyle]} pointerEvents="none">
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <AppText variant="small" color={Colors.textSecondary}>
            {label}
          </AppText>
        </Animated.View>

        {/*
          Empty renders nothing at all — not even a placeholder.

          The label rests over this row until a date is picked, so any text here
          shares its baseline and the two read as one garbled string; a
          transparent placeholder is no defence, because a colour that fails to
          composite brings the collision straight back. The row's height comes
          from `minHeight`, which cannot collide with anything.
        */}
        <View style={styles.valueRow}>
          {hasContent && <AppText variant="body">{formatDob(value) ?? value}</AppText>}
        </View>

        <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
      </Pressable>

      <Animated.View style={[styles.underline, underlineStyle]} />

      {!!error && (
        <AppText variant="caption" color={Colors.warning} style={styles.error}>
          {error}
        </AppText>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <View style={styles.backdropRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close the calendar"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <AppText variant="body" weight="bold">
                {label}
              </AppText>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <Calendar
              value={value}
              onSelect={(next) => {
                onChange(next);
                setOpen(false);
              }}
            />

            {hasContent && (
              <Pressable
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
                <AppText variant="small" weight="semibold" color={Colors.textSecondary}>
                  Clear
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Matches `Field`, leaving room for the lifted label above the row.
    paddingTop: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
  },
  label: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueRow: {
    flex: 1,
    // One line of `body` plus the padding `Field` gives its input, so an empty
    // field is exactly as tall as a filled one and as tall as its neighbours.
    minHeight: FontSize.body * 1.55 + Spacing.sm * 2,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  underline: {
    width: '100%',
  },
  error: {
    marginTop: Spacing.xs,
  },
  backdropRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.sheet,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  clear: {
    alignSelf: 'center',
    minHeight: MinTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
