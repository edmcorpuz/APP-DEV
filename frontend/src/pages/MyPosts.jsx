import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import PostCard from '../components/PostCard.jsx';

// GET /api/me/posts — any logged-in user, returns only their own posts.
export default function MyPosts() {
  const { api, user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/me/posts').then(setPosts).catch(err => setError(err.message));
  }, [api]);

  const canWrite = ['author', 'admin'].includes(user.role);

  return (
    <section>
      <div className="page-head">
        <h1>My posts</h1>
        {canWrite && <Link to="/new" className="button">New post</Link>}
      </div>
      {error && <p className="error">{error}</p>}
      {!posts && !error && <p className="muted">Loading…</p>}
      {posts && posts.length === 0 && (
        <p className="muted">
          {canWrite ? 'You have not written anything yet.' : 'Readers can browse stories but cannot publish. Sign up as an author to write.'}
        </p>
      )}
      <div className="grid">
        {posts?.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}
