import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/Text';
import { usePlayer } from '@/features/player/PlayerProvider';
import {
  DEFAULT_PREFS,
  loadPrefs,
  registerForPush,
  savePrefs,
  updateDevicePrefs,
  type NotificationPrefs,
} from '@/services/notifications';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, autoplay, setAutoplay } = usePlayer();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadPrefs().then(async (stored) => {
      setPrefs(stored);
      setToken(await registerForPush(stored));
    });
  }, []);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await savePrefs(next);

    // Register on first opt-in; otherwise just update the existing row.
    if (token) {
      await updateDevicePrefs(token, next);
    } else if (value) {
      setToken(await registerForPush(next));
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          hitSlop={8}
          style={styles.barButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="title" weight="semibold">
          Settings
        </AppText>
        <View style={styles.barButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="PLAYBACK">
          <Row
            label="Play on open"
            hint="Start the live stream as soon as the app launches"
            value={autoplay}
            onChange={setAutoplay}
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <Row
            label="Station news"
            hint="New posts and announcements"
            value={prefs.news}
            onChange={(v) => toggle('news', v)}
          />
          <Row
            label="Live alerts"
            hint="When a special broadcast starts"
            value={prefs.liveAlerts}
            onChange={(v) => toggle('liveAlerts', v)}
          />
          {!token && (prefs.news || prefs.liveAlerts) && (
            <AppText variant="caption" color={Colors.textSecondary} style={styles.note}>
              Notifications are not active on this device. They need a real device and
              notification permission.
            </AppText>
          )}
        </Section>

        <Section title="ABOUT">
          <View style={styles.aboutRow}>
            <AppText variant="body">{config?.stationName ?? 'Nepaliko Radio'}</AppText>
            <AppText variant="small" color={Colors.textSecondary}>
              {config?.tagline ?? '88.8 MHz FM · Kathmandu'}
            </AppText>
          </View>

          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync('https://nepaliko-radio.web.app/privacy').catch(() => {})
            }
            accessibilityRole="link"
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
            <AppText variant="body">Privacy policy</AppText>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.aboutRow}>
            <AppText variant="small" color={Colors.textSecondary}>
              Version {version}
            </AppText>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="body">{label}</AppText>
        {hint && (
          <AppText variant="caption" color={Colors.textSecondary}>
            {hint}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.primary, false: Colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  barButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  card: {
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    minHeight: 60,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  aboutRow: {
    paddingVertical: Spacing.md,
    gap: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MinTouchTarget + 8,
  },
  pressed: {
    opacity: 0.7,
  },
  note: {
    paddingBottom: Spacing.md,
  },
});
