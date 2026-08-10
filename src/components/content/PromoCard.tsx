import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { promoArtwork } from '@/features/content/usePromos';
import { Colors, Radius, Spacing } from '@/theme';
import type { Promo, PromoPlatform } from '@/types/firestore';

const THUMB_WIDTH = 128;

const PLATFORM: Record<PromoPlatform, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  youtube: { icon: 'logo-youtube', label: 'YouTube' },
  facebook: { icon: 'logo-facebook', label: 'Facebook' },
  instagram: { icon: 'logo-instagram', label: 'Instagram' },
  tiktok: { icon: 'logo-tiktok', label: 'TikTok' },
  twitter: { icon: 'logo-twitter', label: 'Twitter' },
  website: { icon: 'globe-outline', label: 'Website' },
};

function metaFor(promo: Promo) {
  if (promo.kind === 'social') return PLATFORM[promo.platform ?? 'website'];
  if (promo.kind === 'youtubeChannel') return { icon: PLATFORM.youtube.icon, label: 'Channel' };
  return { icon: PLATFORM.youtube.icon, label: 'Video' };
}

/**
 * One promo, laid out as a list row.
 *
 * A row rather than a full-bleed card: at 16:9 a full-width card fits barely one
 * and a half items on screen and pushes the title — the only part that says what
 * the thing actually is — into the margins. The row keeps the thumbnail large
 * enough to recognise while letting the title lead.
 *
 * Opens in an in-app browser rather than leaving for the YouTube app, which
 * would tear the listener away from the stream they are playing.
 */
export function PromoCard({ promo }: { promo: Promo }) {
  const artwork = promoArtwork(promo);
  const meta = metaFor(promo);
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
      accessibilityLabel={`${promo.title}. ${meta.label}. Opens in browser.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.thumbWrap}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.thumb} contentFit="cover" transition={220} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name={meta.icon} size={26} color={Colors.primaryBright} />
          </View>
        )}

        {isVideo && (
          <View style={styles.playBadge}>
            <Ionicons name="play" size={13} color="#FFFFFF" style={styles.playIcon} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <AppText variant="body" weight="semibold" numberOfLines={2}>
          {promo.title}
        </AppText>

        {promo.subtitle ? (
          <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
            {promo.subtitle}
          </AppText>
        ) : null}

        <View style={styles.meta}>
          <Ionicons name={meta.icon} size={13} color={Colors.textSecondary} />
          <AppText variant="caption" color={Colors.textSecondary}>
            {meta.label}
          </AppText>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    paddingRight: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbWrap: {
    width: THUMB_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: Radius.card - 4,
    overflow: 'hidden',
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
  playBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 1,
  },
});
