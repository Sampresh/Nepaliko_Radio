import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormError, PrimaryButton } from '@/components/auth/AuthCard';
import { DateField } from '@/components/ui/DateField';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDob } from '@/features/account/fields';
import { profileDetailsSchema, type ProfileDetailsInput } from '@/features/profile/schema';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * The listener's stored details, with an edit mode.
 *
 * Lives on the Profile tab rather than behind the Home header button, which now
 * navigates here instead of opening its own sheet. Everything except the email
 * is editable — the email is the Auth credential, and changing it is a
 * re-authentication flow rather than a profile edit.
 */
export function ProfileDetails() {
  const { user, profile, updateDetails } = useAuth();
  const [editing, setEditing] = useState(false);

  const name = profile?.name ?? user?.displayName ?? 'Listener';
  const email = profile?.email ?? user?.email ?? '';

  if (editing) {
    return (
      <DetailsForm
        profile={profile}
        fallbackName={name}
        onSave={updateDetails}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <View style={styles.group}>
      <View style={styles.card}>
        <DetailRow icon="person-outline" label="Name" value={name} />
        <DetailRow icon="call-outline" label="Phone" value={profile?.phone} />
        <DetailRow icon="home-outline" label="Address" value={profile?.address} />
        <DetailRow icon="calendar-outline" label="Date of birth" value={formatDob(profile?.dob)} />
        <DetailRow icon="mail-outline" label="Email" value={email} last />
      </View>

      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
        <Ionicons name="create-outline" size={18} color={Colors.textPrimary} />
        <AppText variant="body" weight="semibold">
          Edit details
        </AppText>
      </Pressable>
    </View>
  );
}

function DetailsForm({
  profile,
  fallbackName,
  onSave,
  onDone,
  onCancel,
}: {
  profile: ReturnType<typeof useAuth>['profile'];
  fallbackName: string;
  onSave: (details: ProfileDetailsInput) => Promise<void>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileDetailsInput>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: {
      name: profile?.name ?? fallbackName,
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      dob: profile?.dob ?? '',
    },
  });

  // The profile arrives asynchronously, so the form can mount before the
  // document has loaded. Reset once it lands rather than stranding the user
  // with empty fields that would overwrite real values on save.
  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name ?? fallbackName,
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      dob: profile.dob ?? '',
    });
  }, [profile, fallbackName, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setBusy(true);
    try {
      await onSave(values);
      onDone();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <View style={styles.form}>
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

      <PrimaryButton label="Save changes" onPress={onSubmit} busy={busy} />

      <Pressable
        onPress={onCancel}
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

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  const filled = !!value;

  return (
    <View style={[styles.detailRow, !last && styles.detailDivider]}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      <View style={styles.detailText}>
        <AppText variant="caption" color={Colors.textSecondary}>
          {label}
        </AppText>
        <AppText
          variant="body"
          color={filled ? Colors.textPrimary : Colors.textSecondary}
          numberOfLines={2}>
          {filled ? value : 'Not added yet'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailText: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: MinTouchTarget,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  form: {
    gap: Spacing.xs,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget,
    marginTop: Spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
