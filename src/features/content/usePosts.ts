import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
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
  cursor: QueryDocumentSnapshot<DocumentData> | null;
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
      const cursor = pageParam as QueryDocumentSnapshot<DocumentData> | null;
      const constraints = [
        where('isPublished', '==', true),
        orderBy('publishedAt', 'desc'),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(POSTS_PAGE_SIZE),
      ];

      const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints));
      return {
        posts: snapshot.docs.map(toPost),
        cursor: snapshot.docs.at(-1) ?? null,
      };
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

export function usePost(id: string | undefined) {
  return useQuery<Post | null>({
    queryKey: ['posts', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'posts', id!));
      if (!snapshot.exists()) return null;
      const data = snapshot.data() as PostDoc;
      const { publishedAt, ...rest } = data;
      return { ...rest, id: snapshot.id, publishedAt: publishedAt?.toDate() ?? null };
    },
  });
}
