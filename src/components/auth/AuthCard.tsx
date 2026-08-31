import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackground } from '@/components/ui/AuthBackground';
import { AppText } from '@/components/ui/Text';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * The frosted card the auth forms sit inside, over the drifting background.
 *
 * `bg-white/10 + backdrop-blur-lg` from the reference becomes a translucent
 * white fill over the dark scrim: the visual result is the same on this
 * palette, without a full-screen blur pass on every frame of the animation.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <AuthBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.mark}>
                <AppText variant="title" weight="bold">
                  NR
                </AppText>
              </View>
              <AppText variant="display" weight="bold" style={styles.centered}>
                {title}
              </AppText>
              <AppText variant="small" color={Colors.textSecondary} style={styles.centered}>
                {subtitle}
              </AppText>
            </View>

            {children}
          </View>

          {footer && <View style={styles.footer}>{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Filled station-red action. Shows a spinner and blocks re-entry while busy. */
export function PrimaryButton({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const inactive = busy || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.primary,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
      ]}>
      {busy ? (
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <>
          <AppText variant="body" weight="semibold">
            {label}
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={Colors.textPrimary} />
        </>
      )}
    </Pressable>
  );
}

/** Rule with centred caption — the design's "OR CONTINUE WITH". */
export function FormError({ message }: { message: string }) {
  return (
    <View style={styles.formError}>
      <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
      <AppText variant="small" color={Colors.warning} style={styles.flex}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  card: {
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.sheet,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: MinTouchTarget + 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: 'rgba(255, 138, 128, 0.12)',
  },
  footer: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
