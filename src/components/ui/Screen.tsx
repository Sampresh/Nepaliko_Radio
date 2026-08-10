import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/Text';
import { Colors, Spacing } from '@/theme';

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Standard screen chrome: safe-area top padding and an optional page header. */
export function Screen({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {title && (
        <View style={styles.header}>
          <AppText variant="display" weight="bold">
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="small" color={Colors.textSecondary}>
              {subtitle}
            </AppText>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
});
