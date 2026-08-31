import { NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/stream', label: 'Stream' },
  { to: '/posts', label: 'News' },
  { to: '/promos', label: 'Promos' },
  { to: '/links', label: 'Links' },
  { to: '/requests', label: 'Requests' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/users', label: 'Users' },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-hairline p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-bold text-white">Nepaliko Radio</p>
          <p className="text-xs text-muted">Admin panel</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-surface font-semibold text-white' : 'text-muted hover:text-white'
                }`
              }>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-hairline pt-4">
          <p className="truncate px-3 text-xs text-muted">{user?.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
