import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Card, Spinner } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { ListenerRequest, RequestStatus } from '@/lib/types';

const FILTERS: { key: RequestStatus | 'all'; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'aired', label: 'Aired' },
  { key: 'all', label: 'All' },
];

const TYPE_LABEL: Record<string, string> = {
  song: 'Song request',
  shoutout: 'Shout-out',
  feedback: 'Feedback',
};

export function RequestsPage() {
  const [requests, setRequests] = useState<ListenerRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc')))
      .then((snapshot) =>
        setRequests(
          snapshot.docs.map((d) => ({ ...(d.data() as Omit<ListenerRequest, 'id'>), id: d.id }))
        )
      )
      .catch(() => setError('Could not load requests.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  const setStatus = async (id: string, status: RequestStatus) => {
    await updateDoc(doc(db, 'requests', id), { status }).catch(() => {});
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this request?')) return;
    await deleteDoc(doc(db, 'requests', id)).catch(() => {});
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Requests</h1>
        <p className="text-sm text-muted">Song requests, shout-outs and feedback from listeners</p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.key}
            variant={filter === option.key ? 'primary' : 'secondary'}
            onClick={() => setFilter(option.key)}>
            {option.label}
            {option.key !== 'all' && (
              <span className="opacity-70">
                {requests.filter((r) => r.status === option.key).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {visible.map((request) => (
          <Card key={request.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{request.name}</p>
                <p className="text-xs text-muted">
                  {TYPE_LABEL[request.type] ?? request.type}
                  {request.createdAt && ` · ${request.createdAt.toDate().toLocaleString()}`}
                </p>
              </div>
              <Badge tone={request.status === 'new' ? 'live' : 'neutral'}>{request.status}</Badge>
            </div>

            <p className="whitespace-pre-wrap text-sm text-white">{request.message}</p>

            {request.contact && (
              <p className="text-xs text-muted">Contact: {request.contact}</p>
            )}

            <div className="flex gap-2">
              {request.status !== 'read' && (
                <Button variant="secondary" onClick={() => setStatus(request.id, 'read')}>
                  Mark read
                </Button>
              )}
              {request.status !== 'aired' && (
                <Button variant="secondary" onClick={() => setStatus(request.id, 'aired')}>
                  Mark aired
                </Button>
              )}
              <Button variant="danger" onClick={() => remove(request.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}

        {!visible.length && !error && (
          <Card>
            <p className="text-sm text-muted">Nothing here.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
