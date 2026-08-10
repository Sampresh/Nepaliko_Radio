import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/content/PostCard';
import { Screen } from '@/components/ui/Screen';
import { PostCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { usePinnedPosts, usePosts } from '@/features/content/usePosts';
import { Colors, ScrollBottomInset, Spacing } from '@/theme';
import type { Post } from '@/types/firestore';

export default function NewsScreen() {
  const feed = usePosts();
  const pinned = usePinnedPosts();

  // Pinned first, then the reverse-chronological feed with duplicates removed.
  const posts = useMemo<Post[]>(() => {
    const pinnedPosts = pinned.data ?? [];
    const pinnedIds = new Set(pinnedPosts.map((p) => p.id));
    const rest = (feed.data?.pages ?? []).flatMap((page) => page.posts);
    return [...pinnedPosts, ...rest.filter((p) => !pinnedIds.has(p.id))];
  }, [pinned.data, feed.data]);

  const isInitialLoading = feed.isLoading || pinned.isLoading;
  const isRefreshing = feed.isRefetching && !feed.isFetchingNextPage;

  const refresh = () => {
    feed.refetch();
    pinned.refetch();
  };

  if (isInitialLoading) {
    return (
      <Screen title="News" subtitle="From the station">
        <View style={styles.skeletons}>
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      </Screen>
    );
  }

  if (feed.isError) {
    return (
      <Screen title="News">
        <ErrorState
          title="Could not load news"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={refresh}
        />
      </Screen>
    );
  }

  return (
    <Screen title="News" subtitle="From the station">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.textSecondary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        ListEmptyComponent={
          <EmptyState
            icon="newspaper-outline"
            title="Nothing here yet"
            message="Station news and updates will appear here."
          />
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <AppText variant="caption" color={Colors.textSecondary} style={styles.footer}>
              Loading more…
            </AppText>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: ScrollBottomInset,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.lg,
  },
  skeletons: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
