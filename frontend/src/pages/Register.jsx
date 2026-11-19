import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, Mural } from '../components/Story.jsx';

const ROLES = [
  ['reader', 'Reader', 'Read every story and keep a list of your own.'],
  ['author', 'Author', 'Publish stories and edit the ones you wrote.'],
  ['admin', 'Admin', 'Edit or delete any story on the site.'],
];

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
      await register({ ...form, username: form.username.trim(), email: form.email.trim() });
      navigate('/login', { state: { registered: true, username: form.username.trim() }, viewTransition: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <div className="intro">
        <h1><Ceb className="">Apil na</Ceb></h1>
        <p className="label en">Join Sugilanon</p>
        <p className="dek">Pick a role now. Readers browse, authors write, admins keep the front page tidy.</p>
        <Mural name="kudarat" />
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username <span className="hint">3 to 50 letters, numbers or underscores</span>
          <input name="username" value={form.username} onChange={update} autoComplete="username" minLength={3} maxLength={50} pattern="[A-Za-z0-9_]+" required />
        </label>
        <label>Email<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label>
        <label>
          Password <span className="hint">At least 8 characters</span>
          <input name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" minLength={8} maxLength={128} required />
        </label>
        <fieldset>
          <legend>Role</legend>
          {ROLES.map(([value, name, description]) => (
            <label key={value} className="choice">
              <input type="radio" name="role" value={value} checked={form.role === value} onChange={update} />
              <strong>{name}</strong>
              <span className="hint">{description}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div><button className="button primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button></div>
        <p className="footnote">Already have an account? <Link to="/login" viewTransition>Log in</Link></p>
      </form>
    </div>
  );
}
