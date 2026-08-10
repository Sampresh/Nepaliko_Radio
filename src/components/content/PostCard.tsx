import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { Colors, Radius, Spacing } from '@/theme';
import type { Post } from '@/types/firestore';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

const CATEGORY_LABEL: Record<string, string> = {
  news: 'News',
  music: 'Music',
  event: 'Event',
  announcement: 'Announcement',
};

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={{ pathname: '/post/[id]', params: { id: post.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={post.title}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {post.coverImageUrl && (
          <Image
            source={{ uri: post.coverImageUrl }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            {post.isPinned && (
              <View style={styles.pinned}>
                <Ionicons name="pin" size={11} color={Colors.primary} />
                <AppText variant="caption" weight="semibold" color={Colors.primary}>
                  Pinned
                </AppText>
              </View>
            )}
            {post.category && (
              <View style={styles.chip}>
                <AppText variant="caption" weight="semibold" color={Colors.textSecondary}>
                  {CATEGORY_LABEL[post.category] ?? post.category}
                </AppText>
              </View>
            )}
            <AppText variant="caption" color={Colors.textSecondary}>
              {formatRelativeTime(post.publishedAt)}
            </AppText>
          </View>

          <AppText variant="title" weight="bold" lang={post.language} numberOfLines={2}>
            {post.title}
          </AppText>

          {post.excerpt && (
            <AppText
              variant="small"
              color={Colors.textSecondary}
              lang={post.language}
              numberOfLines={2}>
              {post.excerpt}
            </AppText>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
  },
});
