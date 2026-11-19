import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import PostCard from '../components/PostCard.jsx';

// Public: GET /api/posts works without logging in.
export default function Feed() {
  const { api } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    api('/posts').then(setPosts).catch(err => setError(err.message));
  }, [api]);

  const q = query.trim().toLowerCase();
  const shown = (posts || []).filter(post =>
    !q || post.title.toLowerCase().includes(q) || post.authorName.toLowerCase().includes(q));

  return (
    <section>
      <div className="page-head">
        <h1>Stories worth sharing</h1>
        <input
          type="search"
          placeholder="Search title or author"
          aria-label="Search posts"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>
      {error && <p className="error">{error} Is the Blog API running on port 5000?</p>}
      {!posts && !error && <p className="muted">Loading posts…</p>}
      {posts && shown.length === 0 && <p className="muted">{q ? 'No posts match your search.' : 'No posts yet.'}</p>}
      <div className="grid">
        {shown.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}
