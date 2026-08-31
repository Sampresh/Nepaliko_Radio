import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthCard, FormError, PrimaryButton } from '@/components/auth/AuthCard';
import { DateField } from '@/components/ui/DateField';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { dismiss } from '@/features/auth/navigation';
import { PASSWORD_MIN, signUpSchema, type SignUpInput } from '@/features/auth/schema';
import { Colors, Spacing } from '@/theme';

/**
 * Create an account.
 *
 * One step: Firebase creates the account and emails its own verification link,
 * which costs nothing and needs no SMTP credentials in the app. The address is
 * not verified before the account exists — an unverified listener is nudged on
 * the Profile tab rather than locked out, because nothing here gates the radio.
 */
export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', phone: '', address: '', dob: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setBusy(true);
    try {
      await signUp(values);
      // The tabs are always mounted now, so signing up returns to wherever the
      // listener came from rather than swapping a gated stack underneath them.
      dismiss(router);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
      setBusy(false);
    }
  });

  return (
    <AuthCard
      title="Create account"
      subtitle="Join the Nepaliko Radio community"
      footer={
        <View style={styles.footerRow}>
          <AppText variant="small" color={Colors.textSecondary}>
            Already have an account?
          </AppText>
          <Link href="/sign-in" replace asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText variant="small" weight="semibold" color={Colors.primaryBright}>
                Sign in
              </AppText>
            </Pressable>
          </Link>
        </View>
      }>
      {formError && <FormError message={formError} />}

      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Full name"
            icon="person-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
        )}
      />

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
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <AppText variant="caption" color={Colors.textSecondary}>
        At least {PASSWORD_MIN} characters.
      </AppText>

      <View style={styles.optionalHeader}>
        <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
          A FEW MORE DETAILS
        </AppText>
        <AppText variant="caption" color={Colors.textSecondary}>
          Optional — you can add these later from your profile.
        </AppText>
      </View>

      <Controller
        control={control}
        name="phone"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Mobile number"
            icon="call-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.phone?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="address"
        render={({ field: { value, onChange, onBlur } }) => (
          <Field
            label="Address"
            icon="home-outline"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.address?.message}
            autoCapitalize="words"
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="dob"
        render={({ field: { value, onChange } }) => (
          <DateField
            label="Date of birth"
            value={value}
            onChange={onChange}
            error={errors.dob?.message}
          />
        )}
      />

      <AppText variant="caption" color={Colors.textSecondary}>
        We will email you a link to confirm your address.
      </AppText>

      <PrimaryButton label="Create account" onPress={onSubmit} busy={busy} />
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  optionalHeader: {
    gap: 2,
    marginTop: Spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
