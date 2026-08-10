import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveIndicator } from '@/components/player/LiveIndicator';
import { PlayerActions } from '@/components/player/PlayerActions';
import { PlayPauseButton } from '@/components/player/PlayPauseButton';
import { StationArtwork } from '@/components/player/StationArtwork';
import { Waveform } from '@/components/player/Waveform';
import { AppText } from '@/components/ui/Text';
import { usePlayer } from '@/features/player/PlayerProvider';
import { Colors, Radius, ScrollBottomInset, Spacing } from '@/theme';

export default function ListenScreen() {
  const {
    config,
    status,
    source,
    isPlaying,
    isConnecting,
    error,
    canPlay,
    usingBackup,
    levels,
    toggle,
    retry,
  } = usePlayer();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <View style={[styles.root, styles.centred]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!config) return <ConfigError />;

  const share = () => {
    Share.share({
      title: config.stationName,
      message: `Listen to ${config.stationName} — ${config.tagline}`,
    }).catch(() => {});
  };

  return (
    <View style={styles.root}>
      {/* Warm bloom behind the artwork, echoing the reference's lit top third. */}
      <LinearGradient
        colors={['rgba(183, 28, 28, 0.28)', 'rgba(183, 28, 28, 0.06)', Colors.background]}
        locations={[0, 0.35, 0.72]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <LiveIndicator isLive={config.isLive} />

          <View style={styles.headerActions}>
            <IconButton icon="share-social-outline" label="Share the station" onPress={share} />
            <IconButton
              icon="ellipsis-vertical"
              label="Settings"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.stage}>
            <StationArtwork
              logoUrl={config.logoUrl}
              stationName={config.stationName}
              active={isPlaying}
              levels={levels}
            />

            <View style={styles.identity}>
              <AppText variant="display" weight="bold" style={styles.centreText}>
                {config.stationName}
              </AppText>
              <AppText variant="small" color={Colors.textSecondary} style={styles.centreText}>
                {config.tagline}
              </AppText>
            </View>

            <Waveform active={isPlaying} />

            <View style={styles.controls}>
              <PlayPauseButton
                isPlaying={isPlaying}
                isConnecting={isConnecting}
                disabled={!canPlay}
                onPress={toggle}
              />
              <StatusLine
                canPlay={canPlay}
                offlineMessage={config.offlineMessage}
                isConnecting={isConnecting}
                isPlaying={isPlaying}
                error={error}
                usingBackup={usingBackup}
                onRetry={retry}
              />
              <PlayerActions />
            </View>

            {source === 'cache' && (
              <AppText variant="caption" color={Colors.textSecondary} style={styles.centreText}>
                Showing saved station details — you appear offline.
              </AppText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={Colors.textPrimary} />
    </Pressable>
  );
}

function StatusLine({
  canPlay,
  offlineMessage,
  isConnecting,
  isPlaying,
  error,
  usingBackup,
  onRetry,
}: {
  canPlay: boolean;
  offlineMessage?: string;
  isConnecting: boolean;
  isPlaying: boolean;
  error: string | null;
  usingBackup: boolean;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <View style={styles.statusBlock}>
        <AppText variant="small" color={Colors.warning} style={styles.centreText}>
          Could not connect to the stream.
        </AppText>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <AppText variant="small" weight="semibold">
            Try again
          </AppText>
        </Pressable>
      </View>
    );
  }

  if (!canPlay) {
    return (
      <View style={styles.statusBlock}>
        <AppText variant="small" color={Colors.warning} style={styles.centreText}>
          {offlineMessage ?? 'The station is off air right now.'}
        </AppText>
      </View>
    );
  }

  const message = isConnecting
    ? 'Connecting…'
    : isPlaying
      ? usingBackup
        ? 'On air — backup stream'
        : 'On air'
      : 'Tap to rejoin live';

  return (
    <View style={styles.statusBlock}>
      <AppText variant="small" color={Colors.textSecondary}>
        {message}
      </AppText>
    </View>
  );
}

function ConfigError() {
  return (
    <View style={[styles.root, styles.centred]}>
      <AppText variant="display" weight="bold">
        Nepaliko Radio
      </AppText>
      <AppText variant="small" color={Colors.textSecondary} style={styles.errorBody}>
        We could not load the station settings. Check your connection and reopen the app.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  scroll: {
    paddingBottom: ScrollBottomInset,
  },
  stage: {
    alignItems: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  centreText: {
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 44,
  },
  retryButton: {
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
  errorBody: {
    textAlign: 'center',
  },
});
