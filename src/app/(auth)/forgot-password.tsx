import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet } from 'react-native';

import { AuthCard, FormError, PrimaryButton } from '@/components/auth/AuthCard';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { dismiss } from '@/features/auth/navigation';
import { resetSchema, type ResetInput } from '@/features/auth/schema';
import { Colors, Spacing } from '@/theme';

/**
 * Password reset, using Firebase's own email.
 *
 * `sendPasswordResetEmail` costs nothing on the Spark plan and needs no SMTP
 * credentials anywhere near the app. The wording and the sender name are edited
 * in Console → Authentication → Templates.
 */
export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setSentTo(email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send the email.');
    } finally {
      setBusy(false);
    }
  });

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="Follow the link to choose a new password"
        footer={
          <Pressable onPress={() => dismiss(router)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" weight="semibold" color={Colors.primaryBright}>
              Back to sign in
            </AppText>
          </Pressable>
        }>
        {/*
          Deliberately vague about whether an account exists. `resetPassword`
          swallows `auth/user-not-found` for the same reason: naming the outcome
          here would turn this form into a test for which addresses are
          registered.
        */}
        <AppText variant="body" color={Colors.textSecondary}>
          If {sentTo} has an account, a reset link is on its way. It expires in an hour.
        </AppText>

        <AppText variant="caption" color={Colors.textSecondary}>
          Nothing arrived? Check your spam folder, then try again.
        </AppText>

        <PrimaryButton label="Send again" onPress={onSubmit} busy={busy} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We will email you a link to reset it"
      footer={
        <Pressable onPress={() => dismiss(router)} accessibilityRole="button" hitSlop={8}>
          <AppText variant="small" weight="semibold" color={Colors.textSecondary}>
            Back to sign in
          </AppText>
        </Pressable>
      }>
      {formError && <FormError message={formError} />}

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Email address"
            icon="mail-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <AppText variant="caption" color={Colors.textSecondary} style={styles.hint}>
        The link expires an hour after it is sent.
      </AppText>

      <PrimaryButton label="Send reset link" onPress={onSubmit} busy={busy} />
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: Spacing.xs,
  },
});
