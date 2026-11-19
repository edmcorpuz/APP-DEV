import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { formatDate } from '../components/PostCard.jsx';

export default function PostView() {
  const { id } = useParams();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPost(null);
    setError('');
    api(`/posts/${id}`).then(setPost).catch(err => setError(err.message));
  }, [api, id]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !post) return <p className="error">{error}</p>;
  if (!post) return <p className="muted">Loading…</p>;

  const canEdit = user && (user.id === post.authorId || user.role === 'admin');
  const canDelete = user?.role === 'admin';

  return (
    <article className="post">
      <Link to="/" className="back">← All stories</Link>
      <h1>{post.title}</h1>
      <p className="meta">
        by {post.authorName} · {formatDate(post.created_at)}
        {post.updated_at !== post.created_at && ` · edited ${formatDate(post.updated_at)}`}
      </p>
      <div className="post-body">{post.content}</div>
      {error && <p className="error">{error}</p>}
      {(canEdit || canDelete) && (
        <div className="actions">
          {canEdit && <Link to={`/posts/${post.id}/edit`} className="button">Edit</Link>}
          {canDelete && <button type="button" className="button danger" onClick={handleDelete}>Delete</button>}
        </div>
      )}
    </article>
  );
}
