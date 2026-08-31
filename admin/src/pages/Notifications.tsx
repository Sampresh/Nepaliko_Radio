import { collection, getDocs, limit, orderBy, query, type Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';

/**
 * Send a push notification to every listener.
 *
 * The blunt instrument in this panel. A notification reaches every subscribed
 * phone within seconds and cannot be recalled, so the page is built around
 * making a mistake hard rather than making sending fast: an explicit
 * confirmation, a typed word for emergency alerts, a cooldown after each send,
 * and a history table so two people during an actual emergency can see what has
 * already gone out.
 */

const API_URL = import.meta.env.VITE_NOTIFY_URL as string | undefined;

const TITLE_MAX = 65;
const BODY_MAX = 240;
/** Seconds the send button stays disabled after a successful send. */
const COOLDOWN = 30;

const TOPICS = {
  alerts: {
    label: 'Emergency alerts',
    who: 'Everyone who has not turned alerts off. Makes a sound, shows as a heads-up banner, and breaks through Do Not Disturb.',
    tone: 'warn' as const,
  },
  all: {
    label: 'Station announcements',
    who: 'Everyone who has announcements on. Normal priority — appears in the shade.',
    tone: 'live' as const,
  },
  news: {
    label: 'New posts',
    who: 'Only listeners who opted in to post notifications. Low priority, silent.',
    tone: 'neutral' as const,
  },
};

type Topic = keyof typeof TOPICS;

interface SentNotification {
  id: string;
  topic: Topic;
  title: string;
  body: string;
  link?: string;
  sentByEmail?: string;
  sentAt?: Timestamp;
  status?: 'pending' | 'sent' | 'failed';
  error?: string;
}

export function NotificationsPage() {
  const [topic, setTopic] = useState<Topic>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<SentNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(() => {
    getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(50)))
      .then((snapshot) =>
        setHistory(
          snapshot.docs.map((d) => ({ ...(d.data() as Omit<SentNotification, 'id'>), id: d.id }))
        )
      )
      .catch(() => setError('Could not load the history.'))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(loadHistory, [loadHistory]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isAlert = topic === 'alerts';
  // An emergency alert needs a deliberate act, not a reflex. Typing the word is
  // the cheapest thing that cannot be done by muscle memory on the wrong topic.
  const confirmed = !isAlert || typed.trim().toUpperCase() === 'SEND';

  const problems = useMemo(() => {
    const list: string[] = [];
    if (!title.trim()) list.push('A title is required.');
    if (!body.trim()) list.push('A message is required.');
    if (title.length > TITLE_MAX) list.push(`The title is over ${TITLE_MAX} characters.`);
    if (body.length > BODY_MAX) list.push(`The message is over ${BODY_MAX} characters.`);
    if (link && !/^\/(?!\/)/.test(link)) list.push('The link must be an in-app path, like /news.');
    return list;
  }, [title, body, link]);

  const send = async () => {
    setError(null);
    setNotice(null);

    if (!API_URL) {
      setError('VITE_NOTIFY_URL is not set, so there is nowhere to send to.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('Your session has expired. Sign in again.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_URL.replace(/\/+$/, '')}/api/send-notification`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // The server verifies this and reads the uid from it. Nothing about
          // who is sending is taken from the body.
          authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          topic,
          title: title.trim(),
          body: body.trim(),
          ...(link.trim() ? { link: link.trim() } : {}),
          priority: isAlert ? 'high' : 'normal',
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? 'The notification could not be sent.');
        return;
      }

      setNotice(`Sent to ${TOPICS[topic].label}.`);
      setTitle('');
      setBody('');
      setLink('');
      setTyped('');
      setConfirming(false);
      setCooldown(COOLDOWN);
      loadHistory();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-muted">
          Sent to every listener&apos;s phone within seconds. It cannot be recalled.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-live/40 bg-live/10 px-4 py-3 text-sm text-live">
          {notice}
        </div>
      )}

      <Card className="space-y-4 p-5">
        <Field label="Channel">
          <Select
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value as Topic);
              setTyped('');
              setConfirming(false);
            }}>
            {(Object.keys(TOPICS) as Topic[]).map((key) => (
              <option key={key} value={key}>
                {TOPICS[key].label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">{TOPICS[topic].who}</p>
        </Field>

        {isAlert && (
          <div className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
            <p className="font-semibold">This is the emergency channel.</p>
            <p className="mt-1">
              Relay official sources only — NDRRMA, the Department of Hydrology and Meteorology, or
              the National Seismological Centre — and name the source in the message. Never send
              unconfirmed casualty figures or aftershock predictions. If this channel is used for
              anything routine, people will turn it off and it will be silent when it matters.
            </p>
          </div>
        )}

        <Field label={`Title (${title.length}/${TITLE_MAX})`}>
          <Input
            value={title}
            maxLength={TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isAlert ? 'NDRRMA: flood warning' : 'We are live'}
          />
        </Field>

        <Field label={`Message (${body.length}/${BODY_MAX})`}>
          <Textarea
            rows={3}
            value={body}
            maxLength={BODY_MAX}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              isAlert
                ? 'NDRRMA has issued a flood warning for the Koshi basin. Follow instructions from local authorities.'
                : 'Tune in now for the evening show.'
            }
          />
        </Field>

        <Field label="Opens in the app (optional)">
          <Input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="/news"
          />
          <p className="mt-1 text-xs text-muted">
            An in-app path such as <code>/news</code>. Web links are not accepted.
          </p>
        </Field>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted">
            HOW IT WILL LOOK
          </p>
          <LockScreenPreview title={title} body={body} isAlert={isAlert} />
        </div>

        {problems.length > 0 && (
          <ul className="list-inside list-disc text-xs text-muted">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}

        {!confirming ? (
          <Button
            variant={isAlert ? 'danger' : 'primary'}
            disabled={problems.length > 0 || cooldown > 0}
            onClick={() => setConfirming(true)}>
            {cooldown > 0 ? `Wait ${cooldown}s` : `Send to ${TOPICS[topic].label}`}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-sm text-white">
              Send to <strong>{TOPICS[topic].label}</strong>?
            </p>
            <p className="text-xs text-muted">{TOPICS[topic].who}</p>

            {isAlert && (
              <Field label="Type SEND to confirm">
                <Input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="SEND"
                  autoFocus
                />
              </Field>
            )}

            <div className="flex gap-2">
              <Button
                variant={isAlert ? 'danger' : 'primary'}
                disabled={busy || !confirmed}
                onClick={send}>
                {busy ? 'Sending…' : 'Confirm and send'}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setTyped('');
                }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">RECENTLY SENT</h2>
        {loadingHistory ? (
          <Spinner />
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">Nothing has been sent yet.</p>
        ) : (
          <Card className="divide-y divide-hairline">
            {history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-4">
                <Badge tone={TOPICS[item.topic]?.tone ?? 'neutral'}>
                  {TOPICS[item.topic]?.label ?? item.topic}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="truncate text-xs text-muted">{item.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatSentAt(item.sentAt)}
                    {item.sentByEmail ? ` · ${item.sentByEmail}` : ''}
                  </p>
                  {item.status === 'failed' && item.error && (
                    <p className="mt-1 text-xs text-warn">Failed: {item.error}</p>
                  )}
                </div>
                {item.status && item.status !== 'sent' && (
                  <Badge tone={item.status === 'failed' ? 'warn' : 'neutral'}>{item.status}</Badge>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

/** Approximates an Android lock screen, so the truncation is visible before sending. */
function LockScreenPreview({
  title,
  body,
  isAlert,
}: {
  title: string;
  body: string;
  isAlert: boolean;
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-900 p-4">
      <div className="rounded-xl bg-neutral-100 p-3 text-neutral-900 shadow">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
          <span className="inline-block h-3 w-3 rounded-sm bg-station" />
          Nepaliko Radio
          {isAlert && <span className="ml-1 font-bold text-red-700">· URGENT</span>}
          <span className="ml-auto">now</span>
        </div>
        <p className="truncate text-sm font-semibold">{title || 'Title'}</p>
        <p className="line-clamp-2 text-sm text-neutral-700">
          {body || 'Your message appears here.'}
        </p>
      </div>
    </div>
  );
}

function formatSentAt(value: SentNotification['sentAt']): string {
  if (!value) return 'just now';
  return value.toDate().toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
