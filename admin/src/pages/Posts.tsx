import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge, Button, Card, Spinner } from '@/components/ui';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Admins can read drafts too, so this is unfiltered.
    getDocs(query(collection(db, 'posts'), orderBy('publishedAt', 'desc')))
      .then((snapshot) =>
        setPosts(snapshot.docs.map((d) => ({ ...(d.data() as Omit<Post, 'id'>), id: d.id })))
      )
      .catch(() => setError('Could not load posts.'))
      .finally(() => setLoading(false));
  }, []);

  // Straight to the editor rather than creating a stub first. A post is a link
  // and a title; a placeholder document with neither would be rejected by the
  // security rule, and would leave an "Untitled post" behind if abandoned.
  const createDraft = () => navigate('/posts/new');

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">News</h1>
          <p className="text-sm text-muted">
            {posts.length} {posts.length === 1 ? 'link' : 'links'}
          </p>
        </div>
        <Button onClick={createDraft}>New link</Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {posts.map((post) => (
          <Link key={post.id} to={`/posts/${post.id}`}>
            <Card className="flex items-center gap-4 transition hover:brightness-125">
              {post.thumbnailUrl && (
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="size-12 rounded object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{post.title}</p>
                <p className="truncate text-xs text-muted">
                  {post.source ?? post.url}
                  {' · '}
                  {post.publishedAt?.toDate().toLocaleDateString() ?? 'Not published'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {post.isPinned && <Badge tone="warn">Pinned</Badge>}
                <Badge tone={post.isPublished ? 'live' : 'neutral'}>
                  {post.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}

        {!posts.length && !error && (
          <Card>
            <p className="text-sm text-muted">No links yet. Share the first one.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
