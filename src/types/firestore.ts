import type { Timestamp } from 'firebase/firestore';

export type ContentLanguage = 'np' | 'en';

/** `config/radio` — the single document that drives the player. */
export interface RadioConfig {
  streamUrl: string;
  backupStreamUrl?: string;
  stationName: string;
  tagline: string;
  logoUrl?: string;
  /** Master kill-switch. When false the player refuses to play. */
  isLive: boolean;
  offlineMessage?: string;
  updatedAt?: Timestamp;
}

export type PostCategory = 'news' | 'music' | 'event' | 'announcement';

/** `posts/{postId}` as stored. */
export interface PostDoc {
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  category?: PostCategory;
  language?: ContentLanguage;
  isPublished: boolean;
  isPinned?: boolean;
  publishedAt?: Timestamp;
  authorName?: string;
}

/** A post normalised for the UI — `publishedAt` is a real Date. */
export interface Post extends Omit<PostDoc, 'publishedAt'> {
  id: string;
  publishedAt: Date | null;
}

/**
 * What a promo points at. Drives both the card layout in the app and which
 * fields the admin form asks for.
 */
export type PromoKind = 'youtubeVideo' | 'youtubeChannel' | 'social';

export type PromoPlatform =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'website';

/** `promos/{promoId}` — station self-promotion shown under the player. */
export interface Promo {
  id: string;
  kind: PromoKind;
  title: string;
  subtitle?: string;
  url: string;
  /**
   * Overrides the artwork. For `youtubeVideo` this is optional — the thumbnail
   * is derived from the video id when absent.
   */
  thumbnailUrl?: string;
  /** Only meaningful for `social`; the card picks its icon and tint from this. */
  platform?: PromoPlatform;
  order?: number;
  isActive: boolean;
}

/** `links/{linkId}` — station links. */
export interface StationLink {
  id: string;
  label: string;
  url: string;
  icon?: string;
  order?: number;
  isActive: boolean;
}
