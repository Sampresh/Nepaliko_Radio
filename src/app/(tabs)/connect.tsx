import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { LinkRow } from '@/components/content/LinkRow';
import { RequestForm } from '@/components/content/RequestForm';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { useLinks } from '@/features/content/useLinks';
import { Colors, Radius, ScrollBottomInset, Spacing } from '@/theme';

export default function ConnectScreen() {
  const { data: links, isLoading, isError, refetch } = useLinks();

  return (
    <Screen title="Connect" subtitle="Reach the studio">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
            SEND A MESSAGE
          </AppText>
          <RequestForm />
        </View>

        <View style={styles.section}>
          <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
            FIND US
          </AppText>

          {isLoading ? (
            <View style={styles.list}>
              <Skeleton height={60} radius={Radius.card} />
              <Skeleton height={60} radius={Radius.card} />
              <Skeleton height={60} radius={Radius.card} />
            </View>
          ) : isError ? (
            <ErrorState
              title="Could not load links"
              message="Check your connection and try again."
              actionLabel="Retry"
              onAction={refetch}
            />
          ) : links?.length ? (
            <View style={styles.list}>
              {links.map((link) => (
                <LinkRow key={link.id} link={link} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="link-outline"
              title="No links yet"
              message="The station has not added any links."
            />
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: ScrollBottomInset,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  list: {
    gap: Spacing.sm,
  },
});
