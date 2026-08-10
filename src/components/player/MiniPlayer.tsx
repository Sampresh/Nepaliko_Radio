import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { stationInitials } from '@/config/station';
import { usePlayer } from '@/features/player/PlayerProvider';
import { Colors, MiniPlayerHeight, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * Persistent transport, mounted above the tab bar. Hidden on the Listen tab,
 * where the full player is already on screen.
 */
export function MiniPlayer() {
  const { config, isPlaying, isConnecting, canPlay, toggle } = usePlayer();
  const router = useRouter();
  const pathname = usePathname();

  if (!config || pathname === '/') return null;

  const title = config.stationName;
  const subtitle = config.tagline;

  return (
    <Pressable
      onPress={() => router.navigate('/')}
      accessibilityRole="button"
      accessibilityLabel={`Now playing: ${title}. Open player.`}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      {config.logoUrl ? (
        <Image source={{ uri: config.logoUrl }} style={styles.art} contentFit="cover" />
      ) : (
        <View style={[styles.art, styles.artFallback]}>
          <AppText variant="small" weight="bold">
            {stationInitials(config.stationName)}
          </AppText>
        </View>
      )}

      <View style={styles.text}>
        <AppText variant="small" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>

      <Pressable
        onPress={toggle}
        disabled={!canPlay}
        hitSlop={12}
        accessibilityRole="button"
        // Matches the main transport: stopping a live stream is not a pause.
        accessibilityLabel={isPlaying ? 'Stop radio' : 'Play live radio'}
        style={styles.button}>
        {isConnecting ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : (
          <Ionicons
            name={isPlaying ? 'stop' : 'play'}
            size={20}
            color={canPlay ? Colors.textPrimary : Colors.textSecondary}
          />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MiniPlayerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  art: {
    width: 42,
    height: 42,
    borderRadius: Radius.card - 4,
  },
  artFallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  button: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
