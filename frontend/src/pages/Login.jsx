import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, Mural, Notice } from '../components/Story.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ username: state?.username || '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = event => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate('/', { viewTransition: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <div className="intro">
        <h1><Ceb className="">Maayong pagbalik</Ceb></h1>
        <p className="label en">Welcome back</p>
        <p className="dek">Log in to see your stories, and to write if you're an author.</p>
        <Mural name="kudarat" />
      </div>
      <form className="form" onSubmit={handleSubmit}>
        {state?.registered && <Notice>Account created. Log in with your new password.</Notice>}
        <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="current-password" required /></label>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div><button className="button primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button></div>
        <p className="footnote">New here? <Link to="/register" viewTransition>Create an account</Link></p>
      </form>
    </div>
  );
}
