import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { StationLink } from '@/lib/types';

const ICONS = [
  'website',
  'facebook',
  'youtube',
  'instagram',
  'tiktok',
  'twitter',
  'whatsapp',
  'phone',
  'email',
];

export function LinksPage() {
  const [links, setLinks] = useState<StationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getDocs(collection(db, 'links'))
      .then((snapshot) => {
        const rows = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<StationLink, 'id'>),
          id: d.id,
        }));
        rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setLinks(rows);
      })
      .catch(() => setError('Could not load links.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await addDoc(collection(db, 'links'), {
      label: 'New link',
      url: 'https://',
      icon: 'website',
      order: links.length,
      isActive: true,
    });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Links</h1>
          <p className="text-sm text-muted">Shown on the Connect tab, lowest order first</p>
        </div>
        <Button onClick={add}>Add link</Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {links.map((link) => (
          <LinkRow key={link.id} link={link} onChanged={load} />
        ))}
        {!links.length && !error && (
          <Card>
            <p className="text-sm text-muted">No links yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function LinkRow({ link, onChanged }: { link: StationLink; onChanged: () => void }) {
  const [draft, setDraft] = useState(link);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(link);

  const update = <K extends keyof StationLink>(key: K, value: StationLink[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    // The app only opens https, tel: and mailto: — block anything else here.
    if (!/^(https:\/\/|tel:|mailto:)/i.test(draft.url)) {
      setError('URL must start with https://, tel: or mailto:');
      return;
    }
    setError(null);
    const { id, ...rest } = draft;
    await updateDoc(doc(db, 'links', id), rest).catch(() => setError('Save failed.'));
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete "${link.label}"?`)) return;
    await deleteDoc(doc(db, 'links', link.id)).catch(() => {});
    onChanged();
  };

  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Label">
          <Input value={draft.label} onChange={(e) => update('label', e.target.value)} />
        </Field>

        <Field label="URL">
          <Input value={draft.url} onChange={(e) => update('url', e.target.value)} />
        </Field>

        <Field label="Icon">
          <Select value={draft.icon ?? 'website'} onChange={(e) => update('icon', e.target.value)}>
            {ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Order">
          <Input
            type="number"
            value={draft.order ?? 0}
            onChange={(e) => update('order', Number(e.target.value))}
          />
        </Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => update('isActive', e.target.checked)}
            className="size-4 accent-station"
          />
          Active
        </label>

        <div className="flex gap-2">
          <Button onClick={save} disabled={!dirty}>
            Save
          </Button>
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
