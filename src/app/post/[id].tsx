import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Markdown } from '@/components/content/Markdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { AppText } from '@/components/ui/Text';
import { usePost } from '@/features/content/usePosts';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading, isError, refetch } = usePost(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const share = () => {
    if (!post) return;
    Share.share({
      title: post.title,
      message: post.excerpt ? `${post.title}\n\n${post.excerpt}` : post.title,
    }).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={styles.barButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>

        {post && (
          <Pressable
            onPress={share}
            accessibilityRole="button"
            accessibilityLabel="Share this post"
            hitSlop={8}
            style={styles.barButton}>
            <Ionicons name="share-outline" size={22} color={Colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={200} radius={Radius.card} />
          <Skeleton width="80%" height={26} />
          <Skeleton width="50%" height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} />
        </View>
      ) : isError ? (
        <ErrorState
          title="Could not load this post"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : !post ? (
        <ErrorState
          icon="document-outline"
          title="Post not found"
          message="It may have been unpublished."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
          showsVerticalScrollIndicator={false}>
          {post.coverImageUrl && (
            <Image
              source={{ uri: post.coverImageUrl }}
              style={styles.cover}
              contentFit="cover"
              transition={200}
            />
          )}

          <AppText variant="display" weight="bold" lang={post.language}>
            {post.title}
          </AppText>

          <View style={styles.meta}>
            {post.authorName && (
              <AppText variant="caption" color={Colors.textSecondary}>
                {post.authorName}
              </AppText>
            )}
            <AppText variant="caption" color={Colors.textSecondary}>
              {formatRelativeTime(post.publishedAt)}
            </AppText>
          </View>

          {post.body ? (
            <Markdown content={post.body} lang={post.language} />
          ) : post.excerpt ? (
            <AppText lang={post.language}>{post.excerpt}</AppText>
          ) : null}
        </ScrollView>
      )}
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  loading: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
});
