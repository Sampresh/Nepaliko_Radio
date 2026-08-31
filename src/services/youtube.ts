/**
 * The station's YouTube uploads, fetched without an API key.
 *
 * YouTube's public Atom feed (`/feeds/videos.xml`) needs no key, no quota and
 * no billing account, and returns the 15 most recent uploads for a channel.
 * The Data API v3 alternative would mean shipping a key inside the binary —
 * extractable by anyone with the APK — against a daily quota that a radio app
 * has no way to police. The feed wins on every axis that matters here. The
 * cost is a hard ceiling of 15 videos per channel and no pagination.
 *
 * Channel ids are pinned rather than resolved from the @handles at runtime.
 * A handle lookup means scraping the channel page for `externalId`, which is
 * an undocumented shape that can change without notice; the underlying id
 * never changes, even if the station renames a handle.
 */

export interface YouTubeChannel {
  id: string;
  handle: string;
  /** Display name used until the feed reports the channel's own title. */
  name: string;
}

export const YOUTUBE_CHANNELS: readonly YouTubeChannel[] = [
  { id: 'UCQU87BXMV5Qxiv3iyFKVRPg', handle: 'NepalikoTV', name: 'Nepaliko TV' },
  { id: 'UCt-MbMAro1hOtlnLI6cibCw', handle: 'vlognepal', name: 'Vlog Nepal' },
  { id: 'UC7jnb4dEwNO8of7_iVtqp6A', handle: 'adhyatmatv', name: 'Adhyatma TV' },
] as const;

export interface YouTubeVideo {
  /** The 11-character YouTube video id, unique across all channels. */
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  /**
   * ISO 8601, deliberately kept as a string rather than parsed to a `Date`.
   *
   * This data is written to the persisted React Query cache, which is plain
   * JSON — a `Date` would dehydrate to a string and rehydrate as one while the
   * type still claimed `Date`, which is exactly the mismatch that crashed the
   * News screen. Storing the string keeps the type honest;
   * `formatRelativeTime` coerces it at the point of display.
   */
  publishedAt: string;
}

const FEED_TIMEOUT_MS = 10_000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Resolves XML character entities.
 *
 * Video titles routinely contain `&amp;` and smart quotes as numeric escapes,
 * and the station's titles are Devanagari, which YouTube leaves as literal
 * UTF-8 but neighbouring punctuation may not be. An unresolved entity renders
 * as visible `&amp;` noise in the feed.
 */
function decodeEntities(text: string): string {
  return text.replace(/&(#[Xx]?[0-9A-Fa-f]+|[A-Za-z]+);/g, (match, code: string) => {
    if (code[0] === '#') {
      const isHex = code[1] === 'x' || code[1] === 'X';
      const point = parseInt(isHex ? code.slice(2) : code.slice(1), isHex ? 16 : 10);
      return Number.isFinite(point) && point > 0 ? String.fromCodePoint(point) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

function firstMatch(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match ? decodeEntities(match[1].trim()) : null;
}

/**
 * Parses the Atom feed with regexes rather than a DOM.
 *
 * React Native ships no `DOMParser`, so the alternative is pulling in an XML
 * library for one fixed, machine-generated document shape. These patterns are
 * anchored to tags YouTube has served unchanged for years, and anything that
 * fails to match is skipped rather than throwing — a malformed entry costs one
 * video, never the whole screen.
 */
export function parseYouTubeFeed(xml: string, fallbackChannelName: string): YouTubeVideo[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const videos: YouTubeVideo[] = [];

  for (const entry of entries) {
    const id = firstMatch(entry, /<yt:videoId>([\w-]+)<\/yt:videoId>/);
    const title = firstMatch(entry, /<title>([\s\S]*?)<\/title>/);
    const publishedAt = firstMatch(entry, /<published>([\s\S]*?)<\/published>/);
    if (!id || !title || !publishedAt) continue;

    const thumbnail = firstMatch(entry, /<media:thumbnail[^>]*\burl="([^"]+)"/);

    videos.push({
      id,
      title,
      url: `https://www.youtube.com/watch?v=${id}`,
      // `hqdefault` exists for every upload, where `maxresdefault` is absent on
      // older and lower-resolution ones and would leave holes in the list.
      thumbnailUrl: thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      channelId: firstMatch(entry, /<yt:channelId>([\w-]+)<\/yt:channelId>/) ?? '',
      channelName: firstMatch(entry, /<name>([\s\S]*?)<\/name>/) ?? fallbackChannelName,
      publishedAt,
    });
  }

  return videos;
}

/** `fetch` with a deadline, so one unreachable channel cannot hang a refresh. */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      // The whole point of a refresh is bypassing whatever a CDN cached.
      headers: { 'Cache-Control': 'no-cache' },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchChannelVideos(channel: YouTubeChannel): Promise<YouTubeVideo[]> {
  const response = await fetchWithTimeout(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`,
    FEED_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`${channel.handle}: HTTP ${response.status}`);
  }

  return parseYouTubeFeed(await response.text(), channel.name);
}
