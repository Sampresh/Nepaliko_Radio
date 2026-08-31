import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthCard, FormError, PrimaryButton } from '@/components/auth/AuthCard';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { dismiss } from '@/features/auth/navigation';
import { signInSchema, type SignInInput } from '@/features/auth/schema';
import { Colors, Spacing } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setBusy(true);
    try {
      await signIn(values);
      dismiss(router);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
      setBusy(false);
    }
  });

  // Carries whatever they have typed, so the reset screen does not ask again.
  const onForgotPassword = () => {
    const email = getValues('email').trim();
    router.push(email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password');
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to keep listening"
      footer={
        <View style={styles.footerRow}>
          <AppText variant="small" color={Colors.textSecondary}>
            Don&apos;t have an account?
          </AppText>
          <Link href="/sign-up" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText variant="small" weight="semibold" color={Colors.primaryBright}>
                Sign up
              </AppText>
            </Pressable>
          </Link>
        </View>
      }>
      {formError && <FormError message={formError} />}

      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Email address"
            icon="person-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Password"
            icon="lock-closed-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Pressable
        onPress={onForgotPassword}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.forgot}>
        <AppText variant="caption" color={Colors.textSecondary}>
          Forgot password?
        </AppText>
      </Pressable>

      <PrimaryButton label="Sign in" onPress={onSubmit} busy={busy} />
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
