import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import type { YouTubeVideo } from '@/services/youtube';
import { Colors, Radius, Spacing } from '@/theme';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

const ROW_THUMB_WIDTH = 128;

/**
 * Opens in the in-app browser rather than handing off to the YouTube app.
 *
 * Leaving the app would tear the listener away from the stream they are
 * playing; the page sheet keeps the station one swipe away.
 */
function openVideo(video: YouTubeVideo) {
  WebBrowser.openBrowserAsync(video.url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: Colors.primary,
    toolbarColor: Colors.surface,
  }).catch(() => {});
}

function accessibilityLabelFor(video: YouTubeVideo) {
  return `${video.title}. ${video.channelName}. Opens in browser.`;
}

/** Channel name and age, the two things that place a video in the feed. */
function Meta({ video }: { video: YouTubeVideo }) {
  const age = formatRelativeTime(video.publishedAt);

  return (
    <View style={styles.meta}>
      <Ionicons name="logo-youtube" size={13} color={Colors.primaryBright} />
      <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
        {age ? `${video.channelName} · ${age}` : video.channelName}
      </AppText>
    </View>
  );
}

function PlayBadge({ large }: { large?: boolean }) {
  return (
    <View style={[styles.playBadge, large && styles.playBadgeLarge]}>
      <Ionicons
        name="play"
        size={large ? 20 : 13}
        color="#FFFFFF"
        style={large ? styles.playIconLarge : styles.playIcon}
      />
    </View>
  );
}

/**
 * The newest upload, given a full-bleed 16:9 thumbnail.
 *
 * The reference site leads with one large video before dropping into a list,
 * and it earns the space: it is the only card where the thumbnail is large
 * enough to read the on-screen text that Nepali news thumbnails rely on.
 */
export function VideoHeroCard({ video }: { video: YouTubeVideo }) {
  return (
    <Pressable
      onPress={() => openVideo(video)}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabelFor(video)}
      style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
      <View style={styles.heroThumbWrap}>
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={styles.fill}
          contentFit="cover"
          transition={220}
        />
        <PlayBadge large />
      </View>

      <View style={styles.heroBody}>
        <AppText variant="title" weight="bold" numberOfLines={3}>
          {video.title}
        </AppText>
        <Meta video={video} />
      </View>
    </Pressable>
  );
}

/**
 * Every video after the first, as a list row.
 *
 * A row rather than another full-bleed card: at 16:9 a full-width card fits
 * barely one and a half items on screen and pushes the title — the only part
 * that says what the video actually is — towards the margins.
 */
export function VideoRow({ video }: { video: YouTubeVideo }) {
  return (
    <Pressable
      onPress={() => openVideo(video)}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabelFor(video)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowThumbWrap}>
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={styles.fill}
          contentFit="cover"
          transition={220}
        />
        <PlayBadge />
      </View>

      <View style={styles.rowBody}>
        <AppText variant="body" weight="semibold" numberOfLines={2}>
          {video.title}
        </AppText>
        <Meta video={video} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
  hero: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  heroThumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.background,
  },
  heroBody: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
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
  rowThumbWrap: {
    width: ROW_THUMB_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: Radius.card - 4,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  playBadgeLarge: {
    left: Spacing.md,
    bottom: Spacing.md,
    width: 44,
    height: 44,
  },
  playIcon: {
    marginLeft: 2,
  },
  playIconLarge: {
    marginLeft: 3,
  },
});
