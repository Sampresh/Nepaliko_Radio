import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { openBrowserAsync } from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { thumbnailFor } from '@/features/content/linkPost';
import { Colors, Radius, Spacing } from '@/theme';
import type { Post } from '@/types/firestore';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

/**
 * A shared link, rendered as a card.
 *
 * Opens in an in-app browser rather than handing off to the system one: the
 * listener is usually mid-stream, and leaving the app for a browser is how a
 * radio session ends. Coming back is the OS back gesture, which returns them to
 * the feed exactly where they were.
 */
export function PostCard({ post }: { post: Post }) {
  const thumbnail = thumbnailFor(post);
  const source = post.source?.trim();
  const when = post.publishedAt ? formatRelativeTime(post.publishedAt) : null;

  return (
    <Pressable
      onPress={() => void openBrowserAsync(post.url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${post.title}${source ? `, from ${source}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {thumbnail && (
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
          // A thumbnail that 404s must leave the card looking deliberate rather
          // than broken, which the background colour handles on its own.
          recyclingKey={post.id}
        />
      )}

      <View style={styles.body}>
        {post.isPinned && (
          <View style={styles.pinned}>
            <Ionicons name="pin" size={11} color={Colors.primary} />
            <AppText variant="caption" weight="semibold" color={Colors.primary}>
              Pinned
            </AppText>
          </View>
        )}

        <AppText variant="body" weight="bold" numberOfLines={2}>
          {post.title}
        </AppText>

        {!!post.description?.trim() && (
          <AppText variant="small" color={Colors.textSecondary} numberOfLines={2}>
            {post.description}
          </AppText>
        )}

        <View style={styles.metaRow}>
          {!!source && (
            <>
              <Ionicons name="link-outline" size={12} color={Colors.textSecondary} />
              <AppText variant="caption" color={Colors.textSecondary} numberOfLines={1}>
                {source}
              </AppText>
            </>
          )}
          {!!source && !!when && (
            <AppText variant="caption" color={Colors.textSecondary}>
              ·
            </AppText>
          )}
          {!!when && (
            <AppText variant="caption" color={Colors.textSecondary}>
              {when}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    // 16:9, which is what a YouTube `hqdefault` is once letterboxing is cropped.
    aspectRatio: 16 / 9,
    backgroundColor: Colors.skeleton,
  },
  body: {
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
