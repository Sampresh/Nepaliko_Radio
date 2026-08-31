import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DashboardPage } from '@/pages/Dashboard';
import { LinksPage } from '@/pages/Links';
import { LoginPage } from '@/pages/Login';
import { NotificationsPage } from '@/pages/Notifications';
import { PostEditorPage } from '@/pages/PostEditor';
import { PostsPage } from '@/pages/Posts';
import { PromosPage } from '@/pages/Promos';
import { RequestsPage } from '@/pages/Requests';
import { StreamConfigPage } from '@/pages/StreamConfig';
import { UsersPage } from '@/pages/Users';

function Protected() {
  const { isAdmin, loading, user } = useAuth();

  if (loading) return <Spinner />;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Protected />}>
            <Route index element={<DashboardPage />} />
            <Route path="stream" element={<StreamConfigPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="posts/:id" element={<PostEditorPage />} />
            <Route path="promos" element={<PromosPage />} />
            <Route path="links" element={<LinksPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
