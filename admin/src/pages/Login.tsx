import { useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Button, Card, Field, Input, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const { signIn, user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (user && isAdmin) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch {
      // Deliberately vague: never confirm whether an address exists.
      setError('Sign in failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-lg font-bold">Nepaliko Radio</h1>
          <p className="text-sm text-muted">Sign in to manage the station</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {user && !isAdmin && (
            <p className="text-xs text-warn">
              This account is signed in but is not an admin. Ask an owner to add it to the
              `admins` collection.
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
