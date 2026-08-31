import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SignInPitchCard } from '@/components/auth/SignInPitch';
import { DeleteAccountCard } from '@/components/profile/DeleteAccountCard';
import { ProfileDetails } from '@/components/profile/ProfileDetails';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEmailVerification } from '@/features/auth/useEmailVerification';
import { Colors, MinTouchTarget, Radius, ScrollBottomInset, Spacing } from '@/theme';

/** "12 August 2026" — the join date reads as a fact, not a timestamp. */
const JOINED_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/**
 * The only place sign-in lives.
 *
 * Every other tab works signed out, so this screen has two shapes: the pitch for
 * a listener without an account, and their details once they have one. Nothing
 * here is a prerequisite for the radio.
 */
export default function ProfileScreen() {
  const { user } = useAuth();
  return <Screen title="Profile">{user ? <SignedIn /> : <SignedOut />}</Screen>;
}

function SignedOut() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.pitch}>
        <View style={[styles.avatar, styles.avatarMuted]}>
          <Ionicons name="person-outline" size={34} color={Colors.textSecondary} />
        </View>
      </View>

      <SignInPitchCard />

      <View style={styles.group}>
        <Row icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        <Row
          icon="chatbubbles-outline"
          label="Send a request"
          onPress={() => router.navigate('/connect')}
        />
      </View>
    </ScrollView>
  );
}

function SignedIn() {
  const { user, profile, signOutUser, resendVerification } = useAuth();
  const router = useRouter();
  const { verified, checking, notYet, check } = useEmailVerification();
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // The Firestore profile is authoritative for the name, but a listener whose
  // profile write failed still has the Auth record — fall through both rather
  // than showing an empty header.
  const name = profile?.name ?? user?.displayName ?? 'Listener';
  const email = profile?.email ?? user?.email ?? '';
  const joined = profile?.createdAt;

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'NR';

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in at any time. The radio keeps working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOutUser() },
    ]);
  };

  const resend = () => {
    setResendNotice(null);
    resendVerification()
      .then(() => setResendNotice('Sent. Check your inbox, and your spam folder.'))
      .catch((error: unknown) =>
        setResendNotice(error instanceof Error ? error.message : 'Could not send the email.')
      );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <AppText variant="display" weight="bold">
            {initials}
          </AppText>
        </View>
        <AppText variant="title" weight="bold">
          {name}
        </AppText>
        {!!email && (
          <AppText variant="small" color={Colors.textSecondary}>
            {email}
          </AppText>
        )}
        {joined && (
          <AppText variant="caption" color={Colors.textSecondary}>
            Member since {joined.toLocaleDateString(undefined, JOINED_FORMAT)}
          </AppText>
        )}
      </View>

      {/*
        A nudge, not a gate — and one that clears itself.

        `useEmailVerification` refreshes on foreground and polls while this is on
        screen, because Firebase caches `emailVerified` locally: clicking the
        link in a mail app changes nothing the SDK can see on its own. The button
        is the third path, and the only one the listener can watch working.
      */}
      {!verified && (
        <View style={styles.notice}>
          <View style={styles.noticeRow}>
            <Ionicons name="mail-unread-outline" size={18} color={Colors.warning} />
            <AppText variant="small" color={Colors.warning} style={styles.flex}>
              Verify your email to secure your account.
            </AppText>
          </View>

          <View style={styles.noticeActions}>
            <Pressable
              onPress={resend}
              accessibilityRole="button"
              style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}>
              <AppText variant="small" weight="semibold">
                Resend email
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => void check()}
              accessibilityRole="button"
              disabled={checking}
              style={({ pressed }) => [styles.noticeButton, pressed && styles.pressed]}>
              <AppText variant="small" weight="semibold" color={Colors.primaryBright}>
                {checking ? 'Checking…' : "I've verified"}
              </AppText>
            </Pressable>
          </View>

          {notYet && (
            <AppText variant="caption" color={Colors.textSecondary}>
              Not verified yet — check your inbox.
            </AppText>
          )}
          {!!resendNotice && (
            <AppText variant="caption" color={Colors.textSecondary}>
              {resendNotice}
            </AppText>
          )}
        </View>
      )}

      <ProfileDetails />

      <View style={styles.group}>
        <Row icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        <Row
          icon="chatbubbles-outline"
          label="Send a request"
          onPress={() => router.navigate('/connect')}
        />
      </View>

      <View style={styles.group}>
        <Row
          icon="log-out-outline"
          label="Sign out"
          tint={Colors.warning}
          onPress={confirmSignOut}
        />
      </View>

      <DeleteAccountCard />
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  onPress,
  tint = Colors.textPrimary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={tint} />
      <AppText variant="body" color={tint} style={styles.rowLabel}>
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: ScrollBottomInset,
    gap: Spacing.xl,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xl,
  },
  pitch: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  avatarMuted: {
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  notice: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noticeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  noticeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinTouchTarget,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  flex: {
    flex: 1,
  },
  group: {
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MinTouchTarget + 8,
    paddingHorizontal: Spacing.lg,
  },
  rowLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
