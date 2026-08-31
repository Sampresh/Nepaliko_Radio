import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormError, PrimaryButton } from '@/components/auth/AuthCard';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { PASSWORD_MIN } from '@/features/auth/schema';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * The public page both app stores require a link to. It explains the same
 * process this card performs, for someone who has already uninstalled the app.
 */
const POLICY_URL = 'https://nepaliko-radio.web.app/account-deletion';

/**
 * Account deletion, which both app stores require an in-app path to.
 *
 * Firebase refuses to delete an account on a session older than a few minutes,
 * so the password step is not optional gatekeeping we invented — it is the
 * `auth/requires-recent-login` retry. It is asked for only when Firebase
 * actually demands it, so someone who signed in a moment ago is not challenged
 * for no reason.
 */
export function DeleteAccountCard() {
  const { deleteAccount } = useAuth();

  const [confirming, setConfirming] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setConfirming(false);
    setNeedsPassword(false);
    setPassword('');
    setError(null);
  };

  const run = async (withPassword?: string) => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(withPassword);
      // No navigation: `onAuthStateChanged` reports the account gone and the
      // Profile tab swaps to its signed-out shape underneath us.
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Could not delete the account.';
      if (message === 'REAUTH_REQUIRED') {
        setNeedsPassword(true);
        setError('For your security, confirm your password to finish deleting the account.');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    Alert.alert(
      'Delete your account?',
      'Your profile and details are removed for good. This cannot be undone — but the radio keeps working without an account.',
      [
        { text: 'Cancel', style: 'cancel', onPress: reset },
        { text: 'Delete', style: 'destructive', onPress: () => void run() },
      ]
    );
  };

  if (!confirming) {
    return (
      <Pressable
        onPress={() => {
          setConfirming(true);
          confirm();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Ionicons name="trash-outline" size={18} color={Colors.warning} />
        <AppText variant="body" weight="semibold" color={Colors.warning}>
          Delete my account
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      {error && <FormError message={error} />}

      {needsPassword ? (
        <>
          <Field
            label="Current password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />
          <PrimaryButton
            label="Delete my account"
            onPress={() => void run(password)}
            busy={busy}
            disabled={password.length < PASSWORD_MIN}
          />
        </>
      ) : (
        <PrimaryButton label="Delete my account" onPress={confirm} busy={busy} />
      )}

      <Pressable
        onPress={() => void openBrowserAsync(POLICY_URL).catch(() => {})}
        accessibilityRole="link"
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
        <AppText variant="caption" color={Colors.textSecondary}>
          What happens to my data?
        </AppText>
      </Pressable>

      <Pressable
        onPress={reset}
        accessibilityRole="button"
        disabled={busy}
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
        <AppText variant="small" weight="semibold" color={Colors.textSecondary}>
          Cancel
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: MinTouchTarget,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.warning,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.warning,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget,
  },
  pressed: {
    opacity: 0.6,
  },
});
