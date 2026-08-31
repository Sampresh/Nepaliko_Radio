import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/auth/AuthCard';
import { LinkRow } from '@/components/content/LinkRow';
import { RequestForm } from '@/components/content/RequestForm';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLinks } from '@/features/content/useLinks';
import { Colors, Radius, ScrollBottomInset, Spacing } from '@/theme';

export default function ConnectScreen() {
  const { data: links, isLoading, isError, refetch } = useLinks();
  const { user } = useAuth();
  const router = useRouter();
  const locked = !user;

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

          {/*
            The gate sits above the form rather than replacing it, so the thing
            being unlocked is visible. The whole stack is one tap target: a tap
            anywhere on the dimmed form should do the obvious thing rather than
            land on nothing.
          */}
          <View>
            <RequestForm locked={locked} />

            {locked && (
              <Pressable
                onPress={() => router.push('/sign-in')}
                accessibilityRole="button"
                accessibilityLabel="Sign in to send a request"
                style={styles.gate}>
                <View style={styles.gateCard}>
                  <AppText variant="body" weight="bold">
                    Sign in to send a request
                  </AppText>
                  <AppText variant="small" color={Colors.textSecondary}>
                    Requests go straight to the studio, so we ask for a name behind them.
                  </AppText>
                  <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
                </View>
              </Pressable>
            )}
          </View>
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
  gate: {
    // Covers the dimmed form so every tap on it opens sign-in, including taps
    // that land between the inputs.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  gateCard: {
    width: '100%',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
});
