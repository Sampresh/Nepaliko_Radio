import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { ImageUpload } from '@/components/ImageUpload';
import { Button, Card, Field, Input, Spinner, Textarea } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { RadioConfig } from '@/lib/types';

const EMPTY: RadioConfig = {
  streamUrl: '',
  backupStreamUrl: '',
  stationName: 'Nepaliko Radio',
  tagline: '88.8 MHz FM · Kathmandu',
  logoUrl: '',
  isLive: true,
  offlineMessage: '',
  minAppVersion: '',
};

/**
 * Hosts the app is allowed to load over plain http://.
 *
 * Must stay in step with the cleartext exemptions in `app.json`
 * (`ios.infoPlist.NSAppTransportSecurity.NSExceptionDomains` and
 * `expo-build-properties` → `android.usesCleartextTraffic`). An http stream on
 * any other host is blocked by the OS on both platforms and fails silently in
 * the field, so it is rejected here where the message can explain why.
 */
const CLEARTEXT_HOSTS = ['streaming.webhostnepal.com'];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isCleartextAllowed(url: string): boolean {
  return CLEARTEXT_HOSTS.includes(hostOf(url));
}

/** Returns an error message, or null when the URL is usable. */
function validateStreamUrl(url: string, label: string): string | null {
  if (/^https:\/\//i.test(url)) return null;

  if (/^http:\/\//i.test(url)) {
    return isCleartextAllowed(url)
      ? null
      : `${label}: ${hostOf(url) || 'that host'} is not in the app's cleartext exemption list, ` +
          `so http:// will be blocked on iOS and Android. Use https://, or ask for a new app ` +
          `build that exempts this host.`;
  }

  return `${label} must start with https:// (or http:// for an exempted host).`;
}

export function StreamConfigPage() {
  const [config, setConfig] = useState<RadioConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'config', 'radio'))
      .then((snapshot) => {
        if (snapshot.exists()) setConfig({ ...EMPTY, ...(snapshot.data() as RadioConfig) });
      })
      .catch(() => setError('Could not load the current config.'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof RadioConfig>(key: K, value: RadioConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const streamProblem = validateStreamUrl(config.streamUrl, 'Stream URL');
    if (streamProblem) {
      setError(streamProblem);
      return;
    }
    if (config.backupStreamUrl) {
      const backupProblem = validateStreamUrl(config.backupStreamUrl, 'Backup stream URL');
      if (backupProblem) {
        setError(backupProblem);
        return;
      }
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'config', 'radio'),
        { ...config, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setMessage('Saved. Listeners pick this up immediately.');
    } catch {
      setError('Save failed. Check that your account is an admin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Stream</h1>
        <p className="text-sm text-muted">
          Changes go live in the app instantly — no update required.
        </p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Card className="space-y-4">
          <Field
            label="Stream URL"
            hint="Primary Icecast/Shoutcast URL. https://, or http:// for an exempted host.">
            <Input
              value={config.streamUrl}
              onChange={(e) => update('streamUrl', e.target.value)}
              placeholder="https://stream.example.com:8000/live"
              required
            />
          </Field>

          {/^http:\/\//i.test(config.streamUrl) && isCleartextAllowed(config.streamUrl) && (
            <p className="text-xs text-warn">
              This stream is plain http://. It works because {hostOf(config.streamUrl)} is
              exempted in the app build. Moving to https:// would let that exemption be removed,
              which is one less thing to justify at App Store review.
            </p>
          )}

          <Field label="Backup stream URL" hint="Used automatically if the primary fails">
            <Input
              value={config.backupStreamUrl ?? ''}
              onChange={(e) => update('backupStreamUrl', e.target.value)}
              placeholder="https://backup.example.com/live"
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <Field label="Station name">
            <Input
              value={config.stationName}
              onChange={(e) => update('stationName', e.target.value)}
              required
            />
          </Field>

          <Field label="Tagline">
            <Input value={config.tagline} onChange={(e) => update('tagline', e.target.value)} />
          </Field>

          <Field label="Logo">
            <ImageUpload
              value={config.logoUrl}
              folder="station"
              onChange={(url) => update('logoUrl', url)}
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.isLive}
              onChange={(e) => update('isLive', e.target.checked)}
              className="size-4 accent-station"
            />
            <span className="text-sm">
              <span className="font-medium text-white">On air</span>
              <span className="block text-xs text-muted">
                Unchecking this disables playback in the app for everyone.
              </span>
            </span>
          </label>

          <Field label="Off-air message" hint="Shown to listeners while off air">
            <Textarea
              rows={2}
              value={config.offlineMessage ?? ''}
              onChange={(e) => update('offlineMessage', e.target.value)}
              placeholder="We are off air for maintenance. Back at 6 AM."
            />
          </Field>
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-live">{message}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}
