import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { Colors, Radius, Spacing } from '@/theme';

interface StateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

function BaseState({ title, message, icon, actionLabel, onAction, tint }: StateProps & { tint: string }) {
  return (
    <View style={styles.container}>
      {icon && <Ionicons name={icon} size={40} color={tint} />}
      <AppText variant="title" weight="semibold" style={styles.centered}>
        {title}
      </AppText>
      {message && (
        <AppText variant="small" color={Colors.textSecondary} style={styles.centered}>
          {message}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <AppText variant="small" weight="semibold">
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState(props: StateProps) {
  return <BaseState {...props} tint={Colors.textSecondary} />;
}

export function ErrorState(props: StateProps) {
  return <BaseState icon="cloud-offline-outline" {...props} tint={Colors.warning} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
