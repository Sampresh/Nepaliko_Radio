import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { Post, PostDoc } from '@/types/firestore';

export const POSTS_PAGE_SIZE = 10;

function toPost(snapshot: QueryDocumentSnapshot<DocumentData>): Post {
  const data = snapshot.data() as PostDoc;
  const { publishedAt, ...rest } = data;
  return {
    ...rest,
    id: snapshot.id,
    publishedAt: publishedAt?.toDate() ?? null,
  };
}

interface PostsPage {
  posts: Post[];
  /**
   * Epoch millis of the last post's `publishedAt`, deliberately not the
   * Firestore snapshot.
   *
   * A `QueryDocumentSnapshot` cursor is correct in memory but cannot survive
   * the persisted cache: JSON.stringify reduces it to `{"bundle":"NOT
   * SUPPORTED"}`, and handing that back to `startAfter()` throws on the first
   * scroll past page one after a cold start. A plain number round-trips.
   */
  cursor: number | null;
}

/**
 * Reverse-chronological published posts, 10 at a time.
 *
 * The `isPublished` filter is mandatory, not an optimisation: the security
 * rules reject any query that could return an unpublished document.
 */
export function usePosts() {
  return useInfiniteQuery<PostsPage>({
    queryKey: ['posts', 'feed'],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as number | null;
      const constraints = [
        where('isPublished', '==', true),
        orderBy('publishedAt', 'desc'),
        ...(cursor != null ? [startAfter(Timestamp.fromMillis(cursor))] : []),
        limit(POSTS_PAGE_SIZE),
      ];

      const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints));
      const posts = snapshot.docs.map(toPost);
      const last = posts.at(-1)?.publishedAt ?? null;
      return { posts, cursor: last ? last.getTime() : null };
    },
    getNextPageParam: (lastPage) =>
      lastPage.posts.length < POSTS_PAGE_SIZE ? undefined : lastPage.cursor,
  });
}

/** Pinned posts, fetched separately so an older pin still reaches the top. */
export function usePinnedPosts() {
  return useQuery<Post[]>({
    queryKey: ['posts', 'pinned'],
    queryFn: async () => {
      const snapshot = await getDocs(
        query(
          collection(db, 'posts'),
          where('isPublished', '==', true),
          where('isPinned', '==', true),
          orderBy('publishedAt', 'desc'),
          limit(5)
        )
      );
      return snapshot.docs.map(toPost);
    },
  });
}
