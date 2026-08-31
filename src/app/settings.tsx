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
  requestPermission,
  setTopicEnabled,
  type NotificationPrefs,
  type Topic,
} from '@/services/notifications';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, autoplay, setAutoplay } = usePlayer();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  // Null while we are still asking the OS; the note below waits on a real answer
  // rather than flashing "not active" at everyone on the way in.
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    loadPrefs().then(setPrefs);
    requestPermission().then(setGranted);
  }, []);

  const toggle = async (topic: Topic, value: boolean) => {
    // Optimistic: the switch answers the tap, and FCM catches up. A failed
    // subscribe is reasserted from the stored preference on the next launch.
    setPrefs((current) => ({ ...current, [topic]: value }));

    // Turning something on when permission was refused would be a lie — the
    // toggle would sit there enabled and nothing would ever arrive.
    if (value && granted === false) {
      const now = await requestPermission();
      setGranted(now);
      if (!now) {
        setPrefs((current) => ({ ...current, [topic]: false }));
        return;
      }
    }

    setPrefs(await setTopicEnabled({ ...prefs, [topic]: value }, topic, value));
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
            label="Emergency alerts"
            hint="Official earthquake, flood and public-safety warnings"
            value={prefs.alerts}
            onChange={(v) => toggle('alerts', v)}
          />
          {/*
            Stated plainly rather than hidden behind a confirmation. Someone who
            wants this off should be able to turn it off — they just need to
            know what they are turning off.
          */}
          {!prefs.alerts && (
            <View style={styles.warning}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />
              <AppText variant="caption" color={Colors.warning} style={styles.warningText}>
                With this off you will not receive emergency broadcasts from this app. Always
                follow instructions from local authorities.
              </AppText>
            </View>
          )}

          <Row
            label="Station announcements"
            hint="When we go live, and schedule changes"
            value={prefs.all}
            onChange={(v) => toggle('all', v)}
          />
          <Row
            label="New posts"
            hint="A notification each time an article is published"
            value={prefs.news}
            onChange={(v) => toggle('news', v)}
          />

          {granted === false && (
            <AppText variant="caption" color={Colors.textSecondary} style={styles.note}>
              Notifications are blocked for this app. Turn them on in your phone&apos;s settings to
              receive them.
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

          {/*
            Sets the expectation that this app relays advisories rather than
            issuing them, and that it is never the authority of last resort.
          */}
          <View style={styles.aboutRow}>
            <AppText variant="small" color={Colors.textSecondary}>
              Emergency alerts relay official government advisories. Always follow instructions
              from local authorities.
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
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
  },
  note: {
    paddingBottom: Spacing.md,
  },
});
