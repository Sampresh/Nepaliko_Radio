import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { VideoHeroCard, VideoRow } from '@/components/content/VideoCard';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { usePromos } from '@/features/content/usePromos';
import { useYouTubeFeed } from '@/features/content/useYouTubeFeed';
import { Colors, MinTouchTarget, Radius, ScrollBottomInset, Spacing } from '@/theme';
import type { Promo, PromoPlatform } from '@/types/firestore';

const PLATFORM: Record<PromoPlatform, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  youtube: { icon: 'logo-youtube', label: 'YouTube' },
  facebook: { icon: 'logo-facebook', label: 'Facebook' },
  instagram: { icon: 'logo-instagram', label: 'Instagram' },
  tiktok: { icon: 'logo-tiktok', label: 'TikTok' },
  twitter: { icon: 'logo-twitter', label: 'Twitter' },
  website: { icon: 'globe-outline', label: 'Website' },
};

/**
 * The station's feed: every recent upload across its YouTube channels, newest
 * first, over the admin-managed row of social links.
 *
 * The video list is the screen's primary content, so it owns the loading,
 * error and empty states. The "follow us" row is chrome that renders only when
 * Firestore has links to show — it must never be the reason the feed is
 * hidden.
 */
export default function SocialScreen() {
  const feed = useYouTubeFeed();
  const promos = usePromos();

  const socials = promos.data?.filter((promo) => promo.kind === 'social') ?? [];
  const videos = feed.data ?? [];

  const refresh = () => {
    feed.refetch();
    promos.refetch();
  };

  if (feed.isLoading) {
    return (
      <Screen title="Nepaliko Radio" subtitle="Latest from our channels">
        <View style={styles.loading}>
          <Skeleton height={200} radius={Radius.card} />
          <Skeleton height={88} radius={Radius.card} />
          <Skeleton height={88} radius={Radius.card} />
        </View>
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen title="Nepaliko Radio" subtitle="Latest from our channels">
        <ErrorState
          title="Could not load videos"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Nepaliko Radio" subtitle="Latest from our channels">
      <FlatList
        data={videos}
        keyExtractor={(video) => video.id}
        renderItem={({ item, index }) =>
          index === 0 ? <VideoHeroCard video={item} /> : <VideoRow video={item} />
        }
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={refresh}
            tintColor={Colors.textSecondary}
          />
        }
        ListHeaderComponent={socials.length > 0 ? <FollowRow socials={socials} /> : null}
        ListEmptyComponent={
          <EmptyState
            icon="videocam-outline"
            title="No videos yet"
            message="New uploads from the station's channels will appear here."
          />
        }
      />
    </Screen>
  );
}

/** Horizontal row of the station's presence on other platforms. */
function FollowRow({ socials }: { socials: Promo[] }) {
  return (
    <View style={styles.followBlock}>
      <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
        FOLLOW US
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iconRow}>
        {socials.map((promo) => (
          <SocialIcon key={promo.id} promo={promo} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Circular icon button — the station's presence on one platform. */
function SocialIcon({ promo }: { promo: Promo }) {
  const platform = PLATFORM[promo.platform ?? 'website'];

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
      accessibilityLabel={`${promo.title} on ${platform.label}`}
      style={({ pressed }) => [styles.iconItem, pressed && styles.pressed]}>
      <View style={styles.iconCircle}>
        <Ionicons name={platform.icon} size={26} color={Colors.textPrimary} />
      </View>
      <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
        {promo.title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: ScrollBottomInset,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  followBlock: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  iconRow: {
    gap: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  iconItem: {
    alignItems: 'center',
    gap: Spacing.sm,
    width: 76,
    minHeight: MinTouchTarget,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.65,
  },
});
