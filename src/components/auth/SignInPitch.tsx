import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/auth/AuthCard';
import { AppText } from '@/components/ui/Text';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * The one piece of sign-in copy.
 *
 * Written once and used in both places it appears — the Profile tab card and
 * the delayed bottom sheet — so the two can never drift into telling listeners
 * different things about the same account.
 */
export const SIGN_IN_PITCH = {
  title: 'Sign in to Nepaliko Radio',
  body: "We're building more for signed-in listeners — song requests, favourites, and show alerts are on the way. Sign in now and you'll have them first.",
  primary: 'Sign in',
  secondary: 'Maybe later',
} as const;

/** The inline version, for the Profile tab. */
export function SignInPitchCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <AppText variant="title" weight="bold">
        {SIGN_IN_PITCH.title}
      </AppText>
      <AppText variant="small" color={Colors.textSecondary}>
        {SIGN_IN_PITCH.body}
      </AppText>
      <PrimaryButton label={SIGN_IN_PITCH.primary} onPress={() => router.push('/sign-in')} />
      <Pressable
        onPress={() => router.push('/sign-up')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <AppText variant="body" weight="semibold">
          Create an account
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * The delayed bottom sheet.
 *
 * Deliberately a plain `Modal` over the tabs rather than a route: it must never
 * take the screen away from someone who is listening, and dismissing it has to
 * leave them exactly where they were.
 */
export function SignInPitchSheet({
  visible,
  onDismiss,
  onSignIn,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSignIn: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.backdropRoot}>
        {/* Tapping away is a dismissal, not a silent no-op. */}
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Maybe later" />

        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.grabber} />

          <AppText variant="title" weight="bold">
            {SIGN_IN_PITCH.title}
          </AppText>
          <AppText variant="small" color={Colors.textSecondary}>
            {SIGN_IN_PITCH.body}
          </AppText>

          <PrimaryButton label={SIGN_IN_PITCH.primary} onPress={onSignIn} />

          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <AppText variant="body" weight="semibold" color={Colors.textSecondary}>
              {SIGN_IN_PITCH.secondary}
            </AppText>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  backdropRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
