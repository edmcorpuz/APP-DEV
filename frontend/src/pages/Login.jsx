import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h1>Log in</h1>
      {location.state?.registered && <p className="success">Account created. Log in to continue.</p>}
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="current-password" required /></label>
      {error && <p className="error">{error}</p>}
      <button className="button" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted">No account? <Link to="/register">Sign up</Link></p>
    </form>
  );
}
