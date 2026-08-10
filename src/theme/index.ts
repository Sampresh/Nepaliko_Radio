import type { TextStyle } from 'react-native';

import type { ContentLanguage } from '@/types/firestore';

/**
 * Design tokens for Nepaliko Radio.
 *
 * The station's identity is dark red, white and black, so the palette is those
 * three and nothing else — every accent below is a red, a neutral, or a tint of
 * one. Dark-first: radio listening skews evening and night.
 */

export const Colors = {
  /** Station accent. Buttons, active tabs, the artwork ring. */
  primary: '#B71C1C',
  /**
   * A lifted red for anything in motion. Dark red at small sizes disappears
   * against near-black, so the waveform and the live dot use this instead.
   */
  primaryBright: '#E53935',
  background: '#0A0A0B',
  surface: '#151518',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9AA2',
  /** On-air. Red rather than green — the broadcast tally-light convention. */
  live: '#E53935',
  /** Offline and error states. A red tint, so it stays inside the identity. */
  warning: '#FF8A80',
  /** Confirmation. White rather than green, which the palette does not contain. */
  success: '#FFFFFF',
  /** Hairline borders on surfaces. */
  border: 'rgba(255, 255, 255, 0.10)',
  /** Skeleton shimmer base. */
  skeleton: 'rgba(255, 255, 255, 0.06)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  card: 12,
  sheet: 24,
  full: 999,
} as const;

export const FontSize = {
  caption: 12,
  small: 13,
  body: 15,
  title: 20,
  display: 28,
} as const;

/** Font families, registered in the root layout. */
export const FontFamily = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  devanagariRegular: 'NotoSansDevanagari_400Regular',
  devanagariBold: 'NotoSansDevanagari_700Bold',
} as const;

/**
 * React Native does not reliably fall back per-glyph across scripts on Android,
 * so Devanagari content must explicitly ask for the Devanagari face.
 */
export function fontFor(language: ContentLanguage | undefined, weight: 'regular' | 'bold' = 'regular'): TextStyle {
  if (language === 'np') {
    return {
      fontFamily: weight === 'bold' ? FontFamily.devanagariBold : FontFamily.devanagariRegular,
    };
  }
  return { fontFamily: weight === 'bold' ? FontFamily.bold : FontFamily.regular };
}

/** Minimum touch target, per the design principles. */
export const HitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MinTouchTarget = 44;

/** Height reserved for the mini player so scroll views can clear it. */
export const MiniPlayerHeight = 64;
