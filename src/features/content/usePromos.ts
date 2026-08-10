import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { Promo } from '@/types/firestore';

/**
 * Pulls the YouTube video id out of any of the URL shapes people actually paste.
 *
 * Accepts watch?v=, youtu.be/, /embed/, /shorts/, and /live/. Returns null for
 * anything else so the caller can fall back to a generic card rather than
 * requesting a thumbnail that will 404.
 */
export function youTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * `hqdefault` rather than `maxresdefault`: every video has one. maxres is absent
 * on older and lower-resolution uploads and would leave holes in the row.
 */
export function youTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Artwork for a promo, or null when it should render an icon tile instead. */
export function promoArtwork(promo: Promo): string | null {
  if (promo.thumbnailUrl) return promo.thumbnailUrl;
  if (promo.kind !== 'youtubeVideo') return null;

  const id = youTubeVideoId(promo.url);
  return id ? youTubeThumbnail(id) : null;
}

/**
 * Active promos, lowest `order` first.
 *
 * Sorted client-side: `where + orderBy` on separate fields needs a composite
 * index, and this collection is small enough that it is not worth one.
 */
export function usePromos() {
  return useQuery({
    queryKey: ['promos'],
    queryFn: async (): Promise<Promo[]> => {
      const snapshot = await getDocs(
        query(collection(db, 'promos'), where('isActive', '==', true))
      );

      return snapshot.docs
        .map((d) => ({ ...(d.data() as Omit<Promo, 'id'>), id: d.id }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
  });
}
