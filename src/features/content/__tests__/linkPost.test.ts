import {
  derivedThumbnail,
  isPublishableUrl,
  sourceOf,
  thumbnailFor,
  youTubeVideoId,
} from '@/features/content/linkPost';

describe('isPublishableUrl', () => {
  it('accepts an https link to a real host', () => {
    expect(isPublishableUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isPublishableUrl('  https://example.com/a/b  ')).toBe(true);
  });

  it('rejects anything that is not https', () => {
    // The app hands this straight to an in-app browser, so the scheme is the
    // whole check — `javascript:` in particular must never reach it.
    expect(isPublishableUrl('http://example.com')).toBe(false);
    expect(isPublishableUrl('javascript:alert(1)')).toBe(false);
    expect(isPublishableUrl('//example.com')).toBe(false);
    expect(isPublishableUrl('example.com')).toBe(false);
  });

  it('rejects an https URL with no real hostname', () => {
    expect(isPublishableUrl('https://')).toBe(false);
    expect(isPublishableUrl('https://localhost')).toBe(false);
  });
});

describe('sourceOf', () => {
  it('strips www so the byline reads as the publication', () => {
    expect(sourceOf('https://www.bbc.co.uk/news/123')).toBe('bbc.co.uk');
    expect(sourceOf('https://kathmandupost.com/a')).toBe('kathmandupost.com');
  });

  it('returns empty rather than throwing on a half-typed URL', () => {
    // This runs on every keystroke of the admin's URL field, where most
    // intermediate values are not valid URLs.
    expect(sourceOf('https:/')).toBe('');
    expect(sourceOf('')).toBe('');
  });
});

describe('youTubeVideoId', () => {
  const id = 'dQw4w9WgXcQ';

  it('handles the shapes people actually paste', () => {
    expect(youTubeVideoId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(youTubeVideoId(`https://youtu.be/${id}`)).toBe(id);
    expect(youTubeVideoId(`https://youtube.com/embed/${id}`)).toBe(id);
    expect(youTubeVideoId(`https://youtube.com/shorts/${id}`)).toBe(id);
    expect(youTubeVideoId(`https://youtube.com/live/${id}`)).toBe(id);
    expect(youTubeVideoId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
  });

  it('keeps extra query parameters out of the id', () => {
    expect(youTubeVideoId(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(youTubeVideoId(`https://youtu.be/${id}?t=42`)).toBe(id);
  });

  it('rejects ids that are not the right shape', () => {
    // An id is always 11 URL-safe base64 characters; anything else would build
    // a thumbnail URL that 404s.
    expect(youTubeVideoId('https://youtube.com/watch?v=short')).toBeNull();
    expect(youTubeVideoId('https://youtube.com/watch?v=waytoolongtobevalid')).toBeNull();
    expect(youTubeVideoId('https://youtube.com/watch')).toBeNull();
  });

  it('does not treat a lookalike host as YouTube', () => {
    expect(youTubeVideoId(`https://notyoutube.com/watch?v=${id}`)).toBeNull();
    expect(youTubeVideoId(`https://youtube.com.evil.example/watch?v=${id}`)).toBeNull();
  });

  it('returns null for a non-YouTube link', () => {
    expect(youTubeVideoId('https://vimeo.com/12345')).toBeNull();
  });
});

describe('derivedThumbnail', () => {
  it('builds an hqdefault URL from a YouTube link', () => {
    // `hqdefault`, not `maxresdefault`: the latter is missing for a lot of
    // older uploads, and a broken image in a feed is worse than a small one.
    expect(derivedThumbnail('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('returns null when nothing can be derived without a network call', () => {
    expect(derivedThumbnail('https://kathmandupost.com/story')).toBeNull();
  });
});

describe('thumbnailFor', () => {
  it('prefers a manually set thumbnail over the derived one', () => {
    expect(
      thumbnailFor({ url: 'https://youtu.be/dQw4w9WgXcQ', thumbnailUrl: 'https://cdn/x.jpg' })
    ).toBe('https://cdn/x.jpg');
  });

  it('falls back to the derived one when the manual field is blank', () => {
    expect(thumbnailFor({ url: 'https://youtu.be/dQw4w9WgXcQ', thumbnailUrl: '   ' })).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('returns null when there is nothing to show, so the card renders text-only', () => {
    expect(thumbnailFor({ url: 'https://kathmandupost.com/story' })).toBeNull();
  });
});
