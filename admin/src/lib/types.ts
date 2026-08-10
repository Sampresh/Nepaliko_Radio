import type { Timestamp } from 'firebase/firestore';

export type ContentLanguage = 'np' | 'en';
export type PostCategory = 'news' | 'music' | 'event' | 'announcement';
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
  minAppVersion?: string;
  updatedAt?: Timestamp;
}

export interface Post {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  coverImageUrl?: string;
  category?: PostCategory;
  language?: ContentLanguage;
  isPublished: boolean;
  isPinned?: boolean;
  publishedAt?: Timestamp | null;
  authorName?: string;
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
}
