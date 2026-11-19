import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'reader' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h1>Create an account</h1>
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" minLength={3} maxLength={50} required /></label>
      <label>Email<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" minLength={8} maxLength={128} required /></label>
      <label>
        Role
        <select name="role" value={form.role} onChange={update}>
          <option value="reader">Reader — read posts</option>
          <option value="author">Author — write and edit your posts</option>
          <option value="admin">Admin — edit and delete any post</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
      <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
    </form>
  );
}
