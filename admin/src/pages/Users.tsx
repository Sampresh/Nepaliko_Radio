import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Card, Input, Spinner } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';

/**
 * The listener roster.
 *
 * Read-only by design: these documents are owned by the listeners themselves
 * and the rules only grant admins `read`. Deleting an account here would leave
 * an orphaned Firebase Auth record behind, which needs the Admin SDK — a Cloud
 * Function, not a client write.
 */

function formatDate(value: AppUser['createdAt']): string {
  if (!value) return '—';
  return value.toDate().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Newest first. Accounts created before `createdAt` existed would be
    // dropped by an orderBy, but every account is written with it at signup.
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      .then((snapshot) =>
        setUsers(snapshot.docs.map((d) => ({ ...(d.data() as Omit<AppUser, 'id'>), id: d.id })))
      )
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)
    );
  }, [users, search]);

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-muted">
            {users.length} registered {users.length === 1 ? 'listener' : 'listeners'}
          </p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error && <Card className="text-sm text-red-400">{error}</Card>}

      {!error && visible.length === 0 && (
        <Card className="text-sm text-muted">
          {users.length === 0 ? 'No one has signed up yet.' : 'No users match that search.'}
        </Card>
      )}

      {visible.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-5 py-3 font-medium text-white">{user.name || '—'}</td>
                  <td className="px-5 py-3 text-muted">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{user.email || '—'}</span>
                      {/*
                        Mirrored onto the document by the app when it detects
                        verification, since Firestore cannot join against the
                        Auth user list. Absent means unverified or an account
                        that predates the mirror.
                      */}
                      {user.emailVerified ? (
                        <Badge tone="live">verified</Badge>
                      ) : (
                        <Badge tone="warn">unverified</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{user.phone || '—'}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(user.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
