import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { usePlayer } from '@/features/player/PlayerProvider';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

const PRESETS = [15, 30, 45, 60, 90];

function remainingLabel(endsAt: number | null): string | null {
  if (!endsAt) return null;
  const minutes = Math.max(0, Math.ceil((endsAt - Date.now()) / 60_000));
  return `${minutes}m`;
}

/** Sleep timer and share, sitting under the main transport. */
export function PlayerActions() {
  const { config, sleepEndsAt, setSleepTimer } = usePlayer();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [label, setLabel] = useState(() => remainingLabel(sleepEndsAt));

  // Tick the countdown label once a minute while a timer is armed.
  useEffect(() => {
    setLabel(remainingLabel(sleepEndsAt));
    if (!sleepEndsAt) return;
    const interval = setInterval(() => setLabel(remainingLabel(sleepEndsAt)), 30_000);
    return () => clearInterval(interval);
  }, [sleepEndsAt]);

  const share = () => {
    if (!config) return;
    Share.share({
      title: config.stationName,
      message: `Listen to ${config.stationName} — ${config.tagline}`,
    }).catch(() => {});
  };

  return (
    <>
      <View style={styles.row}>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={label ? `Sleep timer, ${label} remaining` : 'Set sleep timer'}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Ionicons
            name="moon-outline"
            size={18}
            color={sleepEndsAt ? Colors.primary : Colors.textSecondary}
          />
          <AppText variant="caption" color={sleepEndsAt ? Colors.primary : Colors.textSecondary}>
            {label ?? 'Sleep'}
          </AppText>
        </Pressable>

        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Share the station"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
          <AppText variant="caption" color={Colors.textSecondary}>
            Share
          </AppText>
        </Pressable>
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="title" weight="semibold">
              Sleep timer
            </AppText>
            <AppText variant="small" color={Colors.textSecondary}>
              Playback stops automatically.
            </AppText>

            <View style={styles.presets}>
              {PRESETS.map((minutes) => (
                <Pressable
                  key={minutes}
                  onPress={() => {
                    setSleepTimer(minutes);
                    setSheetOpen(false);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.preset, pressed && styles.pressed]}>
                  <AppText variant="body" weight="semibold">
                    {minutes}m
                  </AppText>
                </Pressable>
              ))}
            </View>

            {sleepEndsAt && (
              <Pressable
                onPress={() => {
                  setSleepTimer(null);
                  setSheetOpen(false);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
                <AppText variant="small" weight="semibold" color={Colors.warning}>
                  Cancel timer
                </AppText>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  preset: {
    minWidth: 68,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.card,
    backgroundColor: Colors.background,
  },
  cancel: {
    alignItems: 'center',
    minHeight: MinTouchTarget,
    justifyContent: 'center',
  },
});
