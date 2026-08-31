import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
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
import { useAuth } from '@/features/auth/AuthProvider';
import { useSubmitRequest } from '@/features/requests/useSubmitRequest';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * `locked` renders the real form, inert.
 *
 * A greyed-out version of the thing you want is a far better explanation than
 * an empty space where it should be, so the signed-out state shows exactly what
 * signing in unlocks. `pointerEvents="none"` on the wrapper is what makes it
 * genuinely unreachable — a `TextInput` left focusable would still take the
 * keyboard on tab or an accessibility gesture.
 */
export function RequestForm({ locked = false }: { locked?: boolean }) {
  const { submit, reset: resetSubmission, state, error } = useSubmitRequest();
  const { user, profile } = useAuth();

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

  // Pre-fill the name once the profile lands, but never overwrite something the
  // listener has already typed — `reset` here would discard their edit.
  const signedInName = profile?.name ?? user?.displayName ?? '';
  const currentName = watch('name');
  useEffect(() => {
    if (!signedInName || currentName) return;
    reset((values) => ({ ...values, name: signedInName }), { keepDirtyValues: true });
  }, [signedInName, currentName, reset]);

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
    <View
      style={[styles.form, locked && styles.locked]}
      pointerEvents={locked ? 'none' : 'auto'}
      // Hidden from screen readers while locked: the card above it is the thing
      // to interact with, and announcing a form that cannot be filled in is
      // worse than not announcing it.
      accessibilityElementsHidden={locked}
      importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
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
                    // White on the dark-red fill. The old value was the page
                    // background, which left near-black text on dark red.
                    color={selected ? Colors.textPrimary : Colors.textSecondary}
                    // A wrapped label made this chip twice the height of its
                    // neighbours and broke the row.
                    numberOfLines={1}>
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
  locked: {
    opacity: 0.45,
  },
  form: {
    gap: Spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  typeChip: {
    flex: 1,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
