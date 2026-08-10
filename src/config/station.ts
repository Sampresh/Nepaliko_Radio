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
 * The station wordmark, bundled with the app.
 *
 * A transparent PNG so it sits on the dark player without a white plate, and a
 * wide 2.6:1 lockup — it must be rendered with `contentFit="contain"`, never
 * `cover`, which would crop the outer characters clean off.
 *
 * Bundled rather than fetched so the player is never blank on a cold start and
 * works with no network at all. `config/radio.logoUrl` from the admin panel
 * still wins whenever it is set.
 */
export const STATION_LOGO = require('../../assets/images/station-logo.png');

/**
 * Fallback for square slots too small for the wordmark, like the mini player,
 * where a 2.6:1 lockup would shrink to an unreadable smudge.
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
