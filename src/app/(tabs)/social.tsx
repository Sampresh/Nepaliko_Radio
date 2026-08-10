import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PromoCard } from '@/components/content/PromoCard';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { usePromos } from '@/features/content/usePromos';
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

export default function SocialScreen() {
  const { data: promos, isLoading, isError, refetch } = usePromos();

  const socials = promos?.filter((promo) => promo.kind === 'social') ?? [];
  const videos = promos?.filter((promo) => promo.kind !== 'social') ?? [];

  return (
    <Screen title="Social" subtitle="Follow the station">
      {isError ? (
        <ErrorState
          title="Could not load"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={92} radius={Radius.card} />
          <Skeleton height={88} radius={Radius.card} />
          <Skeleton height={88} radius={Radius.card} />
        </View>
      ) : !promos?.length ? (
        <EmptyState
          icon="share-social-outline"
          title="Nothing here yet"
          message="The station has not added any channels or videos."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {socials.length > 0 && (
            <View style={styles.block}>
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
          )}

          {videos.length > 0 && (
            <View style={styles.block}>
              <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
                WATCH
              </AppText>
              <View style={styles.videoGrid}>
                {videos.map((promo) => (
                  <PromoCard key={promo.id} promo={promo} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
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
  content: {
    paddingBottom: ScrollBottomInset,
    gap: Spacing.xxl,
  },
  block: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
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
  videoGrid: {
    gap: Spacing.md,
  },
});
