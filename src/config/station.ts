import type { RadioConfig } from '@/types/firestore';

/**
 * The station's SHOUTcast v1.9.8 mount. The root path streams `audio/mpeg`
 * directly at 48 kbps — there is no `/stream` or `/;` mount to append.
 *
 * Plain http:// because the server offers no TLS on this port. That needs a
 * matching cleartext exemption in app.json for BOTH platforms, or playback
 * fails silently on device:
 *
 *   ios.infoPlist.NSAppTransportSecurity  → NSExceptionDomains entry
 *   expo-build-properties                 → android.usesCleartextTraffic
 *
 * If the station ever gets an https mount, switch this and drop both.
 */
export const STATION_STREAM_URL = 'http://streaming.webhostnepal.com:9888/';

/**
 * Ships with the binary and drives the player until Firestore answers.
 *
 * `config/radio` still wins whenever it exists — this is a floor, not an
 * override. It means a fresh install plays on first launch even before the
 * Firestore listener resolves, and keeps playing if the project is never
 * provisioned. (The previous dev-only override could not do either.)
 */
/**
 * Placeholder artwork until a real logo is uploaded via the admin panel.
 *
 * Drawn as a monogram rather than shipped as an image file: it stays inside the
 * red/white/black identity at any size, needs no asset, and reads clearly as
 * "logo not set yet" instead of looking like a logo someone chose.
 * `config/radio.logoUrl` replaces it the moment it is set.
 */
export function stationInitials(stationName: string): string {
  const words = stationName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NR';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const DEFAULT_RADIO_CONFIG: RadioConfig = {
  streamUrl: STATION_STREAM_URL,
  stationName: 'Nepaliko Radio',
  tagline: '88.8 MHz FM · Kathmandu',
  isLive: true,
};
