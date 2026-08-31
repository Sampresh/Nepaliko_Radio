import { parseYouTubeFeed, YOUTUBE_CHANNELS } from '../youtube';

/** Trimmed from a real response for UCQU87BXMV5Qxiv3iyFKVRPg. */
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
 <title>NepalikoTV</title>
 <entry>
  <id>yt:video:7g4ET6DN16c</id>
  <yt:videoId>7g4ET6DN16c</yt:videoId>
  <yt:channelId>UCQU87BXMV5Qxiv3iyFKVRPg</yt:channelId>
  <title>हर हर महादेब ।। जय शम्भु</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=7g4ET6DN16c"/>
  <author><name>NepalikoTV</name></author>
  <published>2026-08-01T12:42:36+00:00</published>
  <media:group>
   <media:thumbnail url="https://i4.ytimg.com/vi/7g4ET6DN16c/hqdefault.jpg" width="480" height="360"/>
   <media:community><media:statistics views="10"/></media:community>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:Ivs6BgfyKic</id>
  <yt:videoId>Ivs6BgfyKic</yt:videoId>
  <yt:channelId>UCQU87BXMV5Qxiv3iyFKVRPg</yt:channelId>
  <title>Politics &amp; power &#39;live&#39; &quot;now&quot;</title>
  <author><name>NepalikoTV</name></author>
  <published>2026-07-30T08:00:00+00:00</published>
  <media:group>
   <media:thumbnail url="https://i4.ytimg.com/vi/Ivs6BgfyKic/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
</feed>`;

describe('parseYouTubeFeed', () => {
  it('parses every well-formed entry', () => {
    const videos = parseYouTubeFeed(FEED, 'Fallback');
    expect(videos).toHaveLength(2);
  });

  it('maps the fields the card renders', () => {
    const [first] = parseYouTubeFeed(FEED, 'Fallback');

    expect(first).toEqual({
      id: '7g4ET6DN16c',
      title: 'हर हर महादेब ।। जय शम्भु',
      url: 'https://www.youtube.com/watch?v=7g4ET6DN16c',
      thumbnailUrl: 'https://i4.ytimg.com/vi/7g4ET6DN16c/hqdefault.jpg',
      channelId: 'UCQU87BXMV5Qxiv3iyFKVRPg',
      channelName: 'NepalikoTV',
      publishedAt: '2026-08-01T12:42:36+00:00',
    });
  });

  it('keeps publishedAt as an ISO string, never a Date', () => {
    const [first] = parseYouTubeFeed(FEED, 'Fallback');

    expect(typeof first.publishedAt).toBe('string');
    expect(Number.isNaN(Date.parse(first.publishedAt))).toBe(false);
  });

  it('decodes named and numeric XML entities in titles', () => {
    const [, second] = parseYouTubeFeed(FEED, 'Fallback');
    expect(second.title).toBe('Politics & power \'live\' "now"');
  });

  it('falls back to the channel name when the entry has no author', () => {
    const xml = FEED.replace(/<author><name>NepalikoTV<\/name><\/author>/g, '');
    expect(parseYouTubeFeed(xml, 'Fallback')[0].channelName).toBe('Fallback');
  });

  it('derives a thumbnail when media:thumbnail is missing', () => {
    const xml = FEED.replace(/<media:thumbnail[^>]*\/>/g, '');
    expect(parseYouTubeFeed(xml, 'Fallback')[0].thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/7g4ET6DN16c/hqdefault.jpg'
    );
  });

  it('skips a malformed entry rather than throwing', () => {
    const xml = FEED.replace(/<yt:videoId>7g4ET6DN16c<\/yt:videoId>/, '');
    const videos = parseYouTubeFeed(xml, 'Fallback');

    expect(videos).toHaveLength(1);
    expect(videos[0].id).toBe('Ivs6BgfyKic');
  });

  it('returns an empty list for junk input instead of throwing', () => {
    expect(parseYouTubeFeed('', 'Fallback')).toEqual([]);
    expect(parseYouTubeFeed('<html>404</html>', 'Fallback')).toEqual([]);
  });
});

describe('YOUTUBE_CHANNELS', () => {
  it('pins all three station channels by id', () => {
    expect(YOUTUBE_CHANNELS.map((channel) => channel.handle)).toEqual([
      'NepalikoTV',
      'vlognepal',
      'adhyatmatv',
    ]);

    for (const channel of YOUTUBE_CHANNELS) {
      expect(channel.id).toMatch(/^UC[\w-]{22}$/);
    }
  });
});
