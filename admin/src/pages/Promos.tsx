import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { ImageUpload } from '@/components/ImageUpload';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { Promo, PromoKind, PromoPlatform } from '@/lib/types';

const KINDS: { value: PromoKind; label: string }[] = [
  { value: 'youtubeVideo', label: 'YouTube video' },
  { value: 'youtubeChannel', label: 'YouTube channel' },
  { value: 'social', label: 'Social profile' },
];

const PLATFORMS: PromoPlatform[] = [
  'youtube',
  'facebook',
  'instagram',
  'tiktok',
  'twitter',
  'website',
];

/** Kept in step with `youTubeVideoId` in the app so previews agree with cards. */
const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

function videoThumbnail(url: string): string | null {
  const match = url.match(YOUTUBE_ID);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getDocs(collection(db, 'promos'))
      .then((snapshot) => {
        const rows = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<Promo, 'id'>),
          id: d.id,
        }));
        rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setPromos(rows);
      })
      .catch(() => setError('Could not load promos. Is Firestore enabled?'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await addDoc(collection(db, 'promos'), {
      kind: 'youtubeVideo',
      title: 'New promo',
      subtitle: '',
      url: 'https://',
      platform: 'youtube',
      order: promos.length,
      isActive: true,
    }).catch(() => setError('Could not create. Check your admin access.'));
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Promos</h1>
          <p className="text-sm text-muted">
            Shown under the player on the Listen tab, lowest order first
          </p>
        </div>
        <Button onClick={add}>Add promo</Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {promos.map((promo) => (
          <PromoRow key={promo.id} promo={promo} onChanged={load} />
        ))}
        {!promos.length && !error && (
          <Card>
            <p className="text-sm text-muted">
              No promos yet. Add one to start promoting your YouTube videos and socials.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function PromoRow({ promo, onChanged }: { promo: Promo; onChanged: () => void }) {
  const [draft, setDraft] = useState(promo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(promo);

  const update = <K extends keyof Promo>(key: K, value: Promo[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isVideo = draft.kind === 'youtubeVideo';
  const isSocial = draft.kind === 'social';
  // What the app will actually render, so the admin sees it before saving.
  const preview = draft.thumbnailUrl || (isVideo ? videoThumbnail(draft.url) : null);

  const save = async () => {
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!/^https:\/\//i.test(draft.url)) {
      setError('URL must start with https://');
      return;
    }
    if (isVideo && !draft.thumbnailUrl && !videoThumbnail(draft.url)) {
      setError('That does not look like a YouTube video URL. Add a thumbnail, or fix the link.');
      return;
    }

    setError(null);
    setSaving(true);
    const { id, ...rest } = draft;
    await updateDoc(doc(db, 'promos', id), rest).catch(() => setError('Save failed.'));
    setSaving(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete "${promo.title}"?`)) return;
    await deleteDoc(doc(db, 'promos', promo.id)).catch(() => setError('Delete failed.'));
    onChanged();
  };

  return (
    <Card className="space-y-3">
      <div className="flex gap-4">
        <div className="w-40 shrink-0">
          <div className="aspect-video overflow-hidden rounded-lg bg-black/40">
            {preview ? (
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-muted">
                No image
              </div>
            )}
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select
              value={draft.kind}
              onChange={(e) => update('kind', e.target.value as PromoKind)}>
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title">
            <Input value={draft.title} onChange={(e) => update('title', e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="URL">
              <Input
                value={draft.url}
                placeholder="https://youtube.com/watch?v=..."
                onChange={(e) => update('url', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Subtitle (optional)">
            <Input
              value={draft.subtitle ?? ''}
              onChange={(e) => update('subtitle', e.target.value)}
            />
          </Field>

          {isSocial ? (
            <Field label="Platform">
              <Select
                value={draft.platform ?? 'website'}
                onChange={(e) => update('platform', e.target.value as PromoPlatform)}>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Order">
              <Input
                type="number"
                value={draft.order ?? 0}
                onChange={(e) => update('order', Number(e.target.value))}
              />
            </Field>
          )}
        </div>
      </div>

      <Field
        label={
          isVideo ? 'Custom thumbnail (optional — taken from YouTube if empty)' : 'Thumbnail'
        }>
        <ImageUpload
          value={draft.thumbnailUrl}
          folder="promos"
          onChange={(url) => update('thumbnailUrl', url)}
        />
      </Field>

      {isSocial && (
        <Field label="Order">
          <Input
            type="number"
            value={draft.order ?? 0}
            onChange={(e) => update('order', Number(e.target.value))}
          />
        </Field>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="size-4 accent-station"
          />
          Visible in app
        </label>

        <div className="flex gap-2">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
