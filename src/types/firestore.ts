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

/**
 * `posts/{postId}` — a shared link, not an article.
 *
 * News is a link-sharing tool: the station pastes a URL, adds a title, and it
 * renders as a card that opens in an in-app browser. There is deliberately no
 * body, no Markdown and no detail screen — the destination is the content, and
 * a half-built CMS in front of it only creates work.
 */
export interface PostDoc {
  title: string;
  description?: string;
  /** Always `https://`. Enforced by the admin form and the security rules. */
  url: string;
  thumbnailUrl?: string;
  /** Hostname derived from `url` at save time, e.g. `youtube.com`. */
  source?: string;
  isPublished: boolean;
  isPinned?: boolean;
  publishedAt?: Timestamp;
  /** The admin uid that created it. */
  createdBy?: string;
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

/**
 * `users/{uid}` — a listener's profile, keyed by their Firebase Auth uid.
 *
 * Deliberately mirrors only what the app collects at signup plus what the admin
 * roster needs to display. The email is duplicated here from the Auth record
 * because Firestore cannot join against Auth: the admin panel lists users by
 * reading this collection, and a uid alone would be unreadable.
 */
export interface UserProfileDoc {
  name: string;
  email: string;
  /** Contact number, free-form so international formats survive unchanged. */
  phone?: string;
  address?: string;
  /**
   * Date of birth as `YYYY-MM-DD`, not a `Timestamp`. A birthday is a calendar
   * date, and storing it as an instant would shift it across time zones — the
   * admin panel in Kathmandu would show a different day than the listener's.
   */
  dob?: string;
  createdAt?: Timestamp;
  lastSeenAt?: Timestamp;
}

/** A profile normalised for the UI — timestamps are real Dates. */
export interface UserProfile extends Omit<UserProfileDoc, 'createdAt' | 'lastSeenAt'> {
  id: string;
  createdAt: Date | null;
  lastSeenAt: Date | null;
}
