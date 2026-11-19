import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Byline, formatDate, titleTransition } from '../components/Story.jsx';

export default function PostView() {
  const { id } = useParams();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPost(null);
    setError('');
    api(`/posts/${id}`).then(setPost).catch(err => setError(err.message));
  }, [api, id]);

  async function handleDelete() {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      navigate('/', { state: { notice: `Deleted "${post.title}".` } });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (error && !post) {
    return (
      <div className="state" role="alert">
        <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>This story isn't here.</h1>
        <p>{error} It may have been deleted, or the link is wrong.</p>
        <Link to="/" className="button" viewTransition>Back to all stories</Link>
      </div>
    );
  }
  if (!post) return <div className="skeleton article" aria-busy="true"><span className="sr-only">Loading story…</span><span className="big" aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" style={{ width: '70%' }} /></div>;

  const canEdit = user && (user.id === post.authorId || user.role === 'admin');
  const canDelete = user?.role === 'admin';
  const edited = post.updated_at !== post.created_at;

  return (
    <article className="article">
      <Link to="/" className="back" viewTransition>Back to all stories</Link>
      {state?.notice && <p className="notice" role="status">{state.notice}</p>}
      <h1 style={titleTransition(post.id)}>{post.title}</h1>
      <div className="byline">
        <Byline post={post} />
        {edited && <p className="meta">Edited {formatDate(post.updated_at)}</p>}
      </div>
      <div className="body">{post.content}</div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {(canEdit || canDelete) && (
        <div className="actions">
          {canEdit && <Link to={`/posts/${post.id}/edit`} className="button" viewTransition>Edit story</Link>}
          {canDelete && (
            <button type="button" className="button danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete story'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
