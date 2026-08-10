import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { ImageUpload } from '@/components/ImageUpload';
import { Badge, Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
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

const KIND_LABEL: Record<PromoKind, string> = {
  youtubeVideo: 'Video',
  youtubeChannel: 'Channel',
  social: 'Social',
};

/** Kept in step with `youTubeVideoId` in the app so previews agree with cards. */
const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

function videoThumbnail(url: string): string | null {
  const match = url.match(YOUTUBE_ID);
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function artworkFor(promo: Promo): string | null {
  if (promo.thumbnailUrl) return promo.thumbnailUrl;
  return promo.kind === 'youtubeVideo' ? videoThumbnail(promo.url) : null;
}

export function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which row is expanded. A newly created promo opens straight into edit,
  // because its placeholder title is never what you actually want.
  const [openId, setOpenId] = useState<string | null>(null);

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
    try {
      const created = await addDoc(collection(db, 'promos'), {
        kind: 'youtubeVideo',
        title: '',
        subtitle: '',
        url: '',
        platform: 'youtube',
        order: promos.length,
        isActive: false,
      });
      setOpenId(created.id);
      await load();
    } catch {
      setError('Could not create. Check that your account is an admin.');
    }
  };

  /**
   * Swaps a row with its neighbour and renumbers the whole visible sequence,
   * since stored `order` values can arrive duplicated or with gaps.
   */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= promos.length) return;

    const reordered = [...promos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setPromos(reordered); // optimistic, so the row does not lag the click
    await Promise.all(
      reordered.map((promo, position) =>
        updateDoc(doc(db, 'promos', promo.id), { order: position }).catch(() => {})
      )
    );
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promos</h1>
          <p className="text-sm text-muted">
            The Social tab, top to bottom. Socials become icon buttons, videos become cards.
          </p>
        </div>
        <Button onClick={add}>Add promo</Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {promos.map((promo, index) => (
          <PromoRow
            key={promo.id}
            promo={promo}
            open={openId === promo.id}
            onToggle={() => setOpenId(openId === promo.id ? null : promo.id)}
            onChanged={load}
            onMove={(direction) => move(index, direction)}
            canMoveUp={index > 0}
            canMoveDown={index < promos.length - 1}
          />
        ))}

        {!promos.length && !error && (
          <Card>
            <p className="text-sm text-muted">
              No promos yet. Add one to start promoting your YouTube videos and social profiles.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function PromoRow({
  promo,
  open,
  onToggle,
  onChanged,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  promo: Promo;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onMove: (direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [draft, setDraft] = useState(promo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync when the list reloads underneath us (for example after a reorder).
  useEffect(() => setDraft(promo), [promo]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(promo);
  const update = <K extends keyof Promo>(key: K, value: Promo[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isVideo = draft.kind === 'youtubeVideo';
  const isSocial = draft.kind === 'social';
  const preview = artworkFor(draft);

  const save = async () => {
    if (!draft.title.trim()) return setError('Title is required.');
    if (!/^https:\/\//i.test(draft.url)) return setError('URL must start with https://');
    if (isVideo && !draft.thumbnailUrl && !videoThumbnail(draft.url)) {
      return setError('That is not a recognisable YouTube video link. Add a thumbnail, or fix it.');
    }

    setError(null);
    setSaving(true);
    const { id, ...rest } = draft;
    await updateDoc(doc(db, 'promos', id), rest).catch(() => setError('Save failed.'));
    setSaving(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete "${promo.title || 'this promo'}"?`)) return;
    await deleteDoc(doc(db, 'promos', promo.id)).catch(() => setError('Delete failed.'));
    onChanged();
  };

  return (
    <Card className="overflow-hidden !p-0">
      {/* Collapsed summary — the scannable list view. */}
      <div className="flex items-center gap-3 p-3">
        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black/40">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[10px] text-muted">
              no image
            </div>
          )}
        </div>

        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-white">
            {promo.title || <span className="text-muted">Untitled promo</span>}
          </p>
          <p className="truncate text-xs text-muted">
            {KIND_LABEL[promo.kind]} · {promo.url || 'no link yet'}
          </p>
        </button>

        <Badge tone={promo.isActive ? 'live' : 'neutral'}>
          {promo.isActive ? 'Visible' : 'Hidden'}
        </Badge>

        <div className="flex shrink-0 items-center gap-1">
          <IconBtn label="Move up" disabled={!canMoveUp} onClick={() => onMove(-1)}>
            ↑
          </IconBtn>
          <IconBtn label="Move down" disabled={!canMoveDown} onClick={() => onMove(1)}>
            ↓
          </IconBtn>
          <Button variant="secondary" onClick={onToggle}>
            {open ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-hairline p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={draft.kind} onChange={(e) => update('kind', e.target.value as PromoKind)}>
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Title" hint="Shown under the thumbnail in the app">
              <Input
                value={draft.title}
                placeholder="e.g. Nepaliko Morning Show — Episode 12"
                onChange={(e) => update('title', e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Link"
                hint={
                  isVideo
                    ? 'Paste the YouTube link — the thumbnail is fetched automatically'
                    : undefined
                }>
                <Input
                  value={draft.url}
                  placeholder="https://youtube.com/watch?v=..."
                  onChange={(e) => update('url', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Subtitle" hint="Optional second line">
              <Input
                value={draft.subtitle ?? ''}
                onChange={(e) => update('subtitle', e.target.value)}
              />
            </Field>

            {isSocial && (
              <Field label="Platform" hint="Picks the icon shown in the app">
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
            )}
          </div>

          <Field
            label="Thumbnail"
            hint={isVideo ? 'Optional — taken from YouTube when left empty' : undefined}>
            <ImageUpload
              value={draft.thumbnailUrl}
              folder="promos"
              onChange={(url) => update('thumbnailUrl', url)}
            />
          </Field>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                className="size-4 accent-station"
              />
              Visible in the app
            </label>

            <div className="flex gap-2">
              <Button variant="danger" onClick={remove}>
                Delete
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="size-8 rounded-lg border border-hairline text-sm text-muted transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
      {children}
    </button>
  );
}
