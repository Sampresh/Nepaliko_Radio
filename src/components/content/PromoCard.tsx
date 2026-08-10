import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { promoArtwork } from '@/features/content/usePromos';
import { Colors, Radius, Spacing } from '@/theme';
import type { Promo, PromoPlatform } from '@/types/firestore';

export const PROMO_CARD_WIDTH = 208;

const PLATFORM: Record<PromoPlatform, { icon: keyof typeof Ionicons.glyphMap; tint: string }> = {
  youtube: { icon: 'logo-youtube', tint: '#FF0033' },
  facebook: { icon: 'logo-facebook', tint: '#1877F2' },
  instagram: { icon: 'logo-instagram', tint: '#E1306C' },
  tiktok: { icon: 'logo-tiktok', tint: '#FFFFFF' },
  twitter: { icon: 'logo-twitter', tint: '#1DA1F2' },
  website: { icon: 'globe-outline', tint: Colors.primary },
};

function badgeFor(promo: Promo) {
  if (promo.kind === 'social') return PLATFORM[promo.platform ?? 'website'];
  return PLATFORM.youtube;
}

/**
 * One promo in the horizontal row under the player.
 *
 * Opens in an in-app browser rather than leaving for the YouTube app — a hard
 * app switch would tear the listener away from the stream they are playing.
 */
export function PromoCard({ promo, full }: { promo: Promo; full?: boolean }) {
  const artwork = promoArtwork(promo);
  const badge = badgeFor(promo);
  const isVideo = promo.kind === 'youtubeVideo';

  const open = () => {
    WebBrowser.openBrowserAsync(promo.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: Colors.primary,
      toolbarColor: Colors.surface,
    }).catch(() => {});
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${promo.title}${promo.subtitle ? `. ${promo.subtitle}` : ''}`}
      style={({ pressed }) => [styles.card, full && styles.cardFull, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.thumb} contentFit="cover" transition={220} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name={badge.icon} size={38} color={badge.tint} />
          </View>
        )}

        {/* Play glyph reads as "this is a video" without a second network call. */}
        {isVideo && (
          <View style={styles.playOverlay}>
            <View style={styles.playDot}>
              <Ionicons name="play" size={16} color="#FFFFFF" style={styles.playIcon} />
            </View>
          </View>
        )}

        {!isVideo && (
          <View style={[styles.badge, { backgroundColor: badge.tint }]}>
            <Ionicons name={badge.icon} size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <AppText variant="small" weight="semibold" numberOfLines={2}>
          {promo.title}
        </AppText>
        {promo.subtitle ? (
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {promo.subtitle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: PROMO_CARD_WIDTH,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  /** Fills the column on the Social tab instead of sitting in a scrolling row. */
  cardFull: {
    width: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.background,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDot: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    padding: Spacing.md,
    gap: 2,
  },
});
