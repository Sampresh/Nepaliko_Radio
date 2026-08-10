import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ImageUpload } from '@/components/ImageUpload';
import { Button, Card, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';

type Draft = Omit<Post, 'id' | 'publishedAt'>;

const EMPTY: Draft = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImageUrl: '',
  category: 'news',
  language: 'en',
  isPublished: false,
  isPinned: false,
  authorName: '',
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

export function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [wasPublished, setWasPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'posts', id))
      .then((snapshot) => {
        if (!snapshot.exists()) {
          setError('This post no longer exists.');
          return;
        }
        const data = snapshot.data() as Post;
        setDraft({ ...EMPTY, ...data });
        setWasPublished(!!data.isPublished);
      })
      .catch(() => setError('Could not load this post.'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      await updateDoc(doc(db, 'posts', id), {
        ...draft,
        slug: draft.slug || slugify(draft.title),
        // Stamp the publish time the first time it goes live, and never move it
        // afterwards — the feed orders on this field.
        ...(draft.isPublished && !wasPublished ? { publishedAt: serverTimestamp() } : {}),
      });
      setWasPublished(draft.isPublished);
      setMessage('Saved.');
    } catch {
      setError('Save failed. Check that your account is an admin.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !confirm('Delete this post permanently?')) return;
    await deleteDoc(doc(db, 'posts', id)).catch(() => setError('Delete failed.'));
    navigate('/posts');
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit post</h1>
        <Button variant="ghost" onClick={() => navigate('/posts')}>
          Back
        </Button>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Card className="space-y-4">
          <Field label="Title">
            <Input value={draft.title} onChange={(e) => update('title', e.target.value)} required />
          </Field>

          <Field label="Slug" hint="Used for deep links. Left empty, it is generated from the title.">
            <Input
              value={draft.slug ?? ''}
              onChange={(e) => update('slug', e.target.value)}
              placeholder={slugify(draft.title)}
            />
          </Field>

          <Field label="Excerpt" hint="Around 140 characters — shown on the feed card.">
            <Textarea
              rows={2}
              maxLength={200}
              value={draft.excerpt ?? ''}
              onChange={(e) => update('excerpt', e.target.value)}
            />
          </Field>

          <Field label="Cover image">
            <ImageUpload
              value={draft.coverImageUrl}
              folder="posts"
              onChange={(url) => update('coverImageUrl', url)}
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <Field
            label="Body"
            hint="Markdown: **bold**, _italic_, # headings, - lists, [links](https://…)">
            <Textarea
              rows={14}
              className="font-mono text-xs"
              value={draft.body ?? ''}
              onChange={(e) => update('body', e.target.value)}
            />
          </Field>
        </Card>

        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select
              value={draft.category ?? 'news'}
              onChange={(e) => update('category', e.target.value as Draft['category'])}>
              <option value="news">News</option>
              <option value="music">Music</option>
              <option value="event">Event</option>
              <option value="announcement">Announcement</option>
            </Select>
          </Field>

          <Field label="Language">
            <Select
              value={draft.language ?? 'en'}
              onChange={(e) => update('language', e.target.value as Draft['language'])}>
              <option value="en">English</option>
              <option value="np">नेपाली</option>
            </Select>
          </Field>

          <Field label="Author">
            <Input
              value={draft.authorName ?? ''}
              onChange={(e) => update('authorName', e.target.value)}
            />
          </Field>

          <div className="flex flex-col justify-center gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(e) => update('isPublished', e.target.checked)}
                className="size-4 accent-station"
              />
              Published
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!draft.isPinned}
                onChange={(e) => update('isPinned', e.target.checked)}
                className="size-4 accent-station"
              />
              Pin to top
            </label>
          </div>
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-live">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </form>
    </div>
  );
}
