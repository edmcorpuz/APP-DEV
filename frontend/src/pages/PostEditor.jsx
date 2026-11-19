import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

// Used for both /new (POST /api/posts) and /posts/:id/edit (PUT /api/posts/:id).
export default function PostEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const userId = user?.id;
  const role = user?.role;
  useEffect(() => {
    if (!editing) return;
    api(`/posts/${id}`)
      .then(post => {
        if (post.authorId !== userId && role !== 'admin') {
          setError('Only the post owner or an admin can edit this post.');
        }
        setForm({ title: post.title, content: post.content });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [api, editing, id, userId, role]);

  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await api(editing ? `/posts/${id}` : '/posts', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      navigate(`/posts/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form className="form-card wide" onSubmit={handleSubmit}>
      <h1>{editing ? 'Edit post' : 'Write a new post'}</h1>
      <label>Title<input name="title" value={form.title} onChange={update} maxLength={255} required /></label>
      <label>Content<textarea name="content" rows={12} value={form.content} onChange={update} required /></label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish'}</button>
        <button type="button" className="button ghost" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  );
}
