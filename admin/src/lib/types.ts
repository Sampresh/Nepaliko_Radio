import type { Timestamp } from 'firebase/firestore';

export type ContentLanguage = 'np' | 'en';
export type RequestStatus = 'new' | 'read' | 'aired';
export type RequestType = 'song' | 'shoutout' | 'feedback';

export interface RadioConfig {
  streamUrl: string;
  backupStreamUrl?: string;
  stationName: string;
  tagline: string;
  logoUrl?: string;
  isLive: boolean;
  offlineMessage?: string;
  updatedAt?: Timestamp;
}

/**
 * A shared link, not an article. Mirrors `PostDoc` in the app's
 * `src/types/firestore.ts` — the two must stay in step, since both read the
 * same documents.
 */
export interface Post {
  id: string;
  title: string;
  description?: string;
  /** Always `https://`. Enforced by the form and by the security rules. */
  url: string;
  thumbnailUrl?: string;
  /** Hostname derived from `url` at save time, e.g. `youtube.com`. */
  source?: string;
  isPublished: boolean;
  isPinned?: boolean;
  publishedAt?: Timestamp | null;
  createdBy?: string;
}

export type PromoKind = 'youtubeVideo' | 'youtubeChannel' | 'social';

export type PromoPlatform =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'website';

export interface Promo {
  id: string;
  kind: PromoKind;
  title: string;
  subtitle?: string;
  url: string;
  thumbnailUrl?: string;
  platform?: PromoPlatform;
  order?: number;
  isActive: boolean;
}

export interface StationLink {
  id: string;
  label: string;
  url: string;
  icon?: string;
  order?: number;
  isActive: boolean;
}

export interface ListenerRequest {
  id: string;
  type: RequestType;
  name: string;
  message: string;
  contact?: string;
  status: RequestStatus;
  createdAt?: Timestamp;
  deviceHash?: string;
  /** The Firebase Auth uid of the listener who sent it. Required since requests
   *  were gated behind sign-in; older rows predate it. */
  uid?: string;
}

/** `users/{uid}` — a listener account created from the mobile app. */
export interface AppUser {
  /** The document id IS the Firebase Auth uid. */
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  /** `YYYY-MM-DD`. */
  dob?: string;
  /** Mirrored from the Auth record by the app — Firestore cannot join against
   *  the Auth user list, so this is the only way the roster can show it. */
  emailVerified?: boolean;
  createdAt?: Timestamp;
  lastSeenAt?: Timestamp;
}
