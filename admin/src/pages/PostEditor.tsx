import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Field, Input, Spinner, Textarea } from '@/components/ui';
import { auth, db } from '@/lib/firebase';
import type { Post } from '@/lib/types';

/**
 * The link-post editor.
 *
 * Four fields and a preview. News is a link-sharing tool, not a blog: the
 * station pastes a URL, gives it a title, and publishes. There is deliberately
 * no body, no Markdown and no detail screen — the destination is the content,
 * and a half-built CMS in front of it only creates work for whoever has to
 * maintain it.
 */

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 200;

type Draft = {
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  isPublished: boolean;
  isPinned: boolean;
};

const EMPTY: Draft = {
  title: '',
  description: '',
  url: '',
  thumbnailUrl: '',
  isPublished: false,
  isPinned: false,
};

/** The station only publishes `https://` links. */
function isPublishableUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('https://')) return false;
  try {
    return new URL(trimmed).hostname.includes('.');
  } catch {
    return false;
  }
}

/** The hostname without `www.`, for the card's byline. */
function sourceOf(value: string): string {
  try {
    return new URL(value.trim()).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Pulls a YouTube video id out of the shapes people actually paste — `watch?v=`,
 * `youtu.be/`, `/embed/`, `/live/` and `/shorts/`. An id is always 11 URL-safe
 * base64 characters, which is what makes the final check meaningful.
 */
function youTubeVideoId(value: string): string | null {
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
    if (parsed.pathname === '/watch') candidate = parsed.searchParams.get('v');
    else candidate = parsed.pathname.match(/^\/(?:embed|live|shorts)\/([^/?#]+)/)?.[1] ?? null;
  }

  if (!candidate) return null;
  return /^[\w-]{11}$/.test(candidate) ? candidate : null;
}

/**
 * The thumbnail we can derive without a network call.
 *
 * YouTube only, and on purpose: reading Open Graph tags off an arbitrary page
 * means fetching it server-side, which needs a backend this project does not
 * have. `hqdefault` rather than `maxresdefault` — the latter is missing for a
 * lot of older uploads, and a broken image in a feed is worse than a small one.
 */
function derivedThumbnail(url: string): string | null {
  const id = youTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) return;

    getDoc(doc(db, 'posts', id))
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setError('That post no longer exists.');
          return;
        }
        const data = snapshot.data() as Post;
        setDraft({
          title: data.title ?? '',
          description: data.description ?? '',
          url: data.url ?? '',
          thumbnailUrl: data.thumbnailUrl ?? '',
          isPublished: data.isPublished ?? false,
          isPinned: data.isPinned ?? false,
        });
      })
      .catch(() => setError('Could not load that post.'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const derived = useMemo(() => derivedThumbnail(draft.url), [draft.url]);
  const thumbnail = draft.thumbnailUrl.trim() || derived;
  const source = sourceOf(draft.url);

  const urlProblem =
    draft.url.trim() && !isPublishableUrl(draft.url)
      ? 'The link must start with https:// and point at a real site.'
      : null;

  const canSave = !!draft.title.trim() && isPublishableUrl(draft.url) && !saving;

  const save = async (publish: boolean) => {
    setError(null);
    setSaving(true);

    try {
      // Only the keys the security rule allows, and only the ones with a value:
      // writing `thumbnailUrl: ''` would store an empty string the app then has
      // to treat as "no thumbnail" everywhere.
      const payload: Record<string, unknown> = {
        title: draft.title.trim(),
        url: draft.url.trim(),
        source,
        isPublished: publish,
        isPinned: draft.isPinned,
        createdBy: auth.currentUser?.uid ?? '',
      };
      if (draft.description.trim()) payload.description = draft.description.trim();
      if (draft.thumbnailUrl.trim()) payload.thumbnailUrl = draft.thumbnailUrl.trim();

      if (isNew) {
        // Set at first publish rather than at creation, so a draft that sits for
        // a week does not surface a week down the feed the moment it goes live.
        payload.publishedAt = publish ? serverTimestamp() : Timestamp.now();
        await addDoc(collection(db, 'posts'), payload);
      } else if (id) {
        payload.publishedAt = serverTimestamp();
        await setDoc(doc(db, 'posts', id), payload, { merge: true });
      }

      navigate('/posts');
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || isNew) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'posts', id));
      navigate('/posts');
    } catch {
      setError('Could not delete that post.');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{isNew ? 'New link' : 'Edit link'}</h1>
          <p className="text-sm text-muted">Share something with listeners.</p>
        </div>
        {!isNew && (
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {error}
        </div>
      )}

      <Card className="space-y-4 p-5">
        <Field label="Link">
          <Input
            value={draft.url}
            onChange={(event) => update('url', event.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          {urlProblem ? (
            <p className="mt-1 text-xs text-warn">{urlProblem}</p>
          ) : derived ? (
            <p className="mt-1 text-xs text-muted">
              YouTube link — the thumbnail is filled in automatically.
            </p>
          ) : null}
        </Field>

        <Field label={`Title (${draft.title.length}/${TITLE_MAX})`}>
          <Input
            value={draft.title}
            maxLength={TITLE_MAX}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Live from the studio this evening"
          />
        </Field>

        <Field label={`Description (${draft.description.length}/${DESCRIPTION_MAX}, optional)`}>
          <Textarea
            rows={2}
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>

        <Field label="Thumbnail URL (optional)">
          <Input
            value={draft.thumbnailUrl}
            onChange={(event) => update('thumbnailUrl', event.target.value)}
            placeholder={derived ?? 'https://…'}
          />
          {derived && !draft.thumbnailUrl.trim() && (
            <p className="mt-1 text-xs text-muted">Leave blank to use the YouTube thumbnail.</p>
          )}
        </Field>

        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={draft.isPinned}
            onChange={(event) => update('isPinned', event.target.checked)}
          />
          Pin to the top of the feed
        </label>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted">HOW IT WILL LOOK</p>
          <CardPreview
            title={draft.title}
            description={draft.description}
            source={source}
            thumbnail={thumbnail}
          />
        </div>

        <div className="flex gap-2">
          <Button disabled={!canSave} onClick={() => save(true)}>
            {saving ? 'Saving…' : 'Publish'}
          </Button>
          <Button variant="secondary" disabled={!canSave} onClick={() => save(false)}>
            Save as draft
          </Button>
          <Button variant="ghost" onClick={() => navigate('/posts')}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Approximates the card in the app, so the truncation is visible before publishing. */
function CardPreview({
  title,
  description,
  source,
  thumbnail,
}: {
  title: string;
  description: string;
  source: string;
  thumbnail: string | null;
}) {
  return (
    <div className="max-w-sm overflow-hidden rounded-xl border border-hairline bg-canvas">
      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="aspect-video w-full object-cover"
          // A dead thumbnail URL should leave the card looking deliberate
          // rather than showing a broken-image glyph.
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="space-y-1 p-4">
        <p className="line-clamp-2 text-sm font-bold text-white">{title || 'Title'}</p>
        {description && <p className="line-clamp-2 text-sm text-muted">{description}</p>}
        <p className="text-xs text-muted">{source || 'example.com'} · just now</p>
      </div>
    </div>
  );
}
