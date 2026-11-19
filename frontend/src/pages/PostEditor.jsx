import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, readTime } from '../components/Story.jsx';

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
          setError('Only the post owner or an admin can edit this story.');
        }
        setForm({ title: post.title, content: post.content });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [api, editing, id, userId, role]);

  const update = event => setForm({ ...form, [event.target.name]: event.target.value });
  const words = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await api(editing ? `/posts/${id}` : '/posts', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      navigate(`/posts/${saved.id}`, { state: { notice: editing ? 'Changes saved.' : 'Published. It is now on the front page.' } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <div className="skeleton editor" aria-busy="true"><span className="sr-only">Loading story…</span><span className="big" aria-hidden="true" /><span aria-hidden="true" /></div>;

  return (
    <form className="form editor" onSubmit={handleSubmit}>
      <div>
        <h1><Ceb className="">{editing ? 'Usba ang sugilanon' : 'Bag-ong sugilanon'}</Ceb></h1>
        <p className="label" style={{ color: 'var(--gold-text)', margin: '8px 0 0' }}>{editing ? 'Edit story' : 'New story'}</p>
      </div>
      <label>Headline<input name="title" className="title-field" value={form.title} onChange={update} maxLength={255} required /></label>
      <label>Story<textarea name="content" className="body-field" rows={14} value={form.content} onChange={update} required /></label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="bar">
        <span className="meta num">{words} {words === 1 ? 'word' : 'words'}{words > 0 && ` · ${readTime(form.content)}`}</span>
        <div className="actions">
          <button type="button" className="button quiet" onClick={() => navigate(-1)}>Cancel</button>
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish story'}</button>
        </div>
      </div>
    </form>
  );
}
