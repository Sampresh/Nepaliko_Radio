import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import {
  MESSAGE_MAX,
  NAME_MAX,
  REQUEST_TYPES,
  requestSchema,
  type RequestInput,
} from '@/features/requests/schema';
import { useSubmitRequest } from '@/features/requests/useSubmitRequest';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

export function RequestForm() {
  const { submit, reset: resetSubmission, state, error } = useSubmitRequest();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: { type: 'song', name: '', message: '', contact: '' },
  });

  const message = watch('message') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    const ok = await submit(values);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      reset({ type: values.type, name: values.name, message: '', contact: '' });
    }
  });

  if (state === 'success') {
    return (
      <View style={styles.success}>
        <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
        <AppText variant="title" weight="semibold">
          Sent to the studio
        </AppText>
        <AppText variant="small" color={Colors.textSecondary} style={styles.center}>
          Thanks! The team reads every message.
        </AppText>
        <Pressable
          onPress={resetSubmission}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <AppText variant="small" weight="semibold">
            Send another
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="type"
        render={({ field: { value, onChange } }) => (
          <View style={styles.typeRow}>
            {REQUEST_TYPES.map((option) => {
              const selected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChange(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.typeChip, selected && styles.typeChipActive]}>
                  <AppText
                    variant="small"
                    weight={selected ? 'semibold' : 'regular'}
                    color={selected ? Colors.background : Colors.textSecondary}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.field}>
            <AppText variant="caption" color={Colors.textSecondary}>
              YOUR NAME
            </AppText>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={NAME_MAX}
              placeholder="Sita from Pokhara"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              accessibilityLabel="Your name"
            />
            {errors.name && (
              <AppText variant="caption" color={Colors.warning}>
                {errors.name.message}
              </AppText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="message"
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <AppText variant="caption" color={Colors.textSecondary}>
                MESSAGE
              </AppText>
              <AppText
                variant="caption"
                color={message.length > MESSAGE_MAX * 0.9 ? Colors.warning : Colors.textSecondary}>
                {message.length}/{MESSAGE_MAX}
              </AppText>
            </View>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={MESSAGE_MAX}
              multiline
              numberOfLines={4}
              placeholder="Play a Narayan Gopal song for my mother…"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.input, styles.textarea]}
              accessibilityLabel="Your message"
            />
            {errors.message && (
              <AppText variant="caption" color={Colors.warning}>
                {errors.message.message}
              </AppText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="contact"
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.field}>
            <AppText variant="caption" color={Colors.textSecondary}>
              PHONE OR EMAIL (OPTIONAL)
            </AppText>
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              placeholder="Only the station sees this"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              accessibilityLabel="Phone or email, optional"
            />
          </View>
        )}
      />

      {error && (
        <AppText variant="small" color={Colors.warning}>
          {error}
        </AppText>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={state === 'submitting'}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.submit,
          pressed && styles.pressed,
          state === 'submitting' && styles.submitDisabled,
        ]}>
        <AppText variant="body" weight="semibold">
          {state === 'submitting' ? 'Sending…' : 'Send to the studio'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeChip: {
    flex: 1,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
  },
  field: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: MinTouchTarget,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  submit: {
    minHeight: MinTouchTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  success: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  center: {
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
});
