import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
import { listAll, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui';
import { db, storage } from '@/lib/firebase';
import type { RadioConfig } from '@/lib/types';

type Health = 'checking' | 'ok' | 'warn' | 'fail';

interface Check {
  key: string;
  label: string;
  state: Health;
  detail: string;
  fix?: string;
  to?: string;
}

const INITIAL: Check[] = [
  { key: 'stream', label: 'Stream', state: 'checking', detail: 'Checking…' },
  { key: 'logo', label: 'Station logo', state: 'checking', detail: 'Checking…' },
  { key: 'storage', label: 'Image storage', state: 'checking', detail: 'Checking…' },
];

const DOT: Record<Health, string> = {
  checking: 'bg-muted animate-pulse',
  ok: 'bg-live',
  warn: 'bg-warn',
  fail: 'bg-station-bright',
};

/** Rejects rather than hanging, so one slow probe cannot stall the page. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Operational overview.
 *
 * Every failure on this project so far has been a backend setup gap — undeployed
 * rules, a missing config document, Storage never initialised — and each one
 * surfaced as "the app doesn't work" with nothing pointing at the cause. These
 * checks name the cause and the fix.
 *
 * Each check renders as soon as it resolves. An earlier version awaited them all
 * before painting, so the Storage probe (two minutes of retries when the bucket
 * does not exist) left the whole page on a spinner.
 */
export function DashboardPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const [config, setConfig] = useState<RadioConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    const settle = (key: string, patch: Omit<Check, 'key' | 'label'>) =>
      !cancelled &&
      setChecks((prev) =>
        prev.map((check) => (check.key === key ? { ...check, ...patch } : check))
      );

    // Config — drives both the stream and logo rows.
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, 'config', 'radio'));
        const radio = snapshot.exists() ? (snapshot.data() as RadioConfig) : null;
        if (!cancelled) setConfig(radio);

        if (!radio) {
          settle('stream', {
            state: 'fail',
            detail: 'No config saved — the app is running on its built-in fallback.',
            fix: 'Save the station details',
            to: '/stream',
          });
        } else if (!radio.streamUrl) {
          settle('stream', {
            state: 'fail',
            detail: 'Saved, but the stream URL is empty.',
            fix: 'Set the stream URL',
            to: '/stream',
          });
        } else if (!radio.isLive) {
          settle('stream', {
            state: 'warn',
            detail: 'Saved, but “On air” is off, so the app refuses to play.',
            fix: 'Turn on “On air”',
            to: '/stream',
          });
        } else {
          settle('stream', { state: 'ok', detail: radio.streamUrl });
        }

        settle('logo', {
          state: radio?.logoUrl ? 'ok' : 'warn',
          detail: radio?.logoUrl
            ? 'Custom logo set.'
            : 'Not set — the app shows its bundled wordmark.',
          fix: radio?.logoUrl ? undefined : 'Upload a logo',
          to: radio?.logoUrl ? undefined : '/stream',
        });
      } catch {
        settle('stream', {
          state: 'fail',
          detail: 'Could not read config/radio.',
          fix: 'Deploy rules: firebase deploy --only firestore:rules',
        });
        settle('logo', { state: 'warn', detail: 'Unknown — config could not be read.' });
      }
    })();

    // Storage — capped, because an unconfigured bucket otherwise retries for ages.
    (async () => {
      try {
        await withTimeout(listAll(ref(storage, 'station')), 12_000);
        settle('storage', { state: 'ok', detail: 'Reachable — image uploads will work.' });
      } catch {
        settle('storage', {
          state: 'fail',
          detail: 'Not reachable, so image uploads will fail.',
          fix: 'Console → Storage → Get started, then: firebase deploy --only storage',
        });
      }
    })();

    // Counts are decorative; a failure must never block the page.
    (async () => {
      const safe = async (promise: Promise<{ data: () => { count: number } }>) => {
        try {
          return (await promise).data().count;
        } catch {
          return undefined;
        }
      };

      const [posts, promos, links, newRequests] = await Promise.all([
        safe(getCountFromServer(query(collection(db, 'posts')))),
        safe(getCountFromServer(query(collection(db, 'promos')))),
        safe(getCountFromServer(query(collection(db, 'links')))),
        safe(getCountFromServer(query(collection(db, 'requests'), where('status', '==', 'new')))),
      ]);

      if (!cancelled) setCounts({ posts, promos, links, newRequests });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const live = config?.isLive === true && !!config?.streamUrl;
  const needsAction = checks.filter((check) => check.state === 'fail' || check.state === 'warn');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {config?.stationName ?? 'Nepaliko Radio'}
          </h1>
          <p className="text-sm text-muted">{config?.tagline ?? 'Admin panel'}</p>
        </div>

        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            live
              ? 'border-live/30 bg-live/10 text-live'
              : 'border-hairline bg-surface text-muted'
          }`}>
          <span className={`size-2 rounded-full ${live ? 'bg-live' : 'bg-muted'}`} />
          {live ? 'ON AIR' : 'OFF AIR'}
        </span>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat to="/requests" label="New requests" value={counts.newRequests} accent />
        <Stat to="/posts" label="Posts" value={counts.posts} />
        <Stat to="/promos" label="Promos" value={counts.promos} />
        <Stat to="/links" label="Links" value={counts.links} />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-white">Setup</h2>
          <p className="text-xs text-muted">
            {needsAction.length === 0
              ? 'Everything is configured'
              : `${needsAction.length} item${needsAction.length > 1 ? 's' : ''} need attention`}
          </p>
        </div>

        <Card className="divide-y divide-hairline !p-0">
          {checks.map((check) => (
            <div key={check.key} className="flex items-start gap-3 p-4">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[check.state]}`} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{check.label}</p>
                <p className="mt-0.5 break-all text-xs text-muted">{check.detail}</p>
              </div>

              {check.fix &&
                (check.to ? (
                  <Link
                    to={check.to}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-white transition hover:border-station">
                    {check.fix}
                  </Link>
                ) : (
                  <span className="max-w-[45%] shrink-0 text-right text-xs text-warn">
                    {check.fix}
                  </span>
                ))}
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Stat({
  to,
  label,
  value,
  accent,
}: {
  to: string;
  label: string;
  value: number | undefined;
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-hairline bg-surface p-4 transition hover:border-station">
      <p
        className={`text-2xl font-bold tabular-nums ${
          accent && value ? 'text-station-bright' : 'text-white'
        }`}>
        {value ?? '—'}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </Link>
  );
}
