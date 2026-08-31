/**
 * Deriving what we can from a pasted URL.
 *
 * There is no Open Graph scraping here and there should not be: fetching a
 * third-party page to read its meta tags needs a server, and the whole point of
 * this design is that it does not have one. YouTube is the exception worth
 * special-casing because it is most of what a radio station shares and its
 * thumbnail URL is derivable from the video id alone.
 */

/** The station only publishes `https://` links. */
export function isPublishableUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    // A bare scheme parses fine but has nowhere to go.
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * The hostname, without `www.`, for the card's byline.
 *
 * Returns '' rather than throwing, because this runs on every keystroke of a
 * URL field where most intermediate values are not yet valid.
 */
export function sourceOf(value: string): string {
  try {
    return new URL(value.trim()).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Pulls a YouTube video id out of the shapes people actually paste.
 *
 * Covers `watch?v=`, `youtu.be/`, `/embed/`, `/live/` and `/shorts/`. An id is
 * always 11 characters of URL-safe base64, which is what makes the check at the
 * end meaningful rather than decorative.
 */
export function youTubeVideoId(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = parsed.pathname.slice(1);
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') {
      candidate = parsed.searchParams.get('v');
    } else {
      const match = parsed.pathname.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/);
      candidate = match?.[1] ?? null;
    }
  }

  if (!candidate) return null;
  return /^[\w-]{11}$/.test(candidate) ? candidate : null;
}

/**
 * The thumbnail for a URL, if one can be derived without a network call.
 *
 * `hqdefault` rather than `maxresdefault`: the latter is absent for a lot of
 * older and lower-resolution uploads, and a broken image is worse in a feed
 * than a slightly smaller one.
 */
export function derivedThumbnail(url: string): string | null {
  const id = youTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** What the card should show: the manual thumbnail wins, then the derived one. */
export function thumbnailFor(post: { url: string; thumbnailUrl?: string }): string | null {
  return post.thumbnailUrl?.trim() || derivedThumbnail(post.url);
}

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 200;
