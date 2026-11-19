import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const systemTheme = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || systemTheme());
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode: theme just won't persist */ }
    setTheme(next);
  }
  return (
    <button type="button" className="link-button" aria-pressed={theme === 'dark'} onClick={toggle}>
      Dark mode
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const canWrite = user && ['author', 'admin'].includes(user.role);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = event => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="wordmark" viewTransition>Sugilanon</Link>
          <button
            type="button"
            className="button quiet menu-button"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <nav id="site-nav" className={`site-nav${menuOpen ? ' open' : ''}`} aria-label="Main">
            <NavLink to="/" end viewTransition>Stories</NavLink>
            {user && <NavLink to="/me" viewTransition>My stories</NavLink>}
            {canWrite && <NavLink to="/new" viewTransition>Write a story</NavLink>}
            <ThemeToggle />
            {user ? (
              <>
                <span className="who">{user.username}&nbsp;<span>({user.role})</span></span>
                <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" viewTransition>Log in</NavLink>
                <NavLink to="/register" viewTransition>Create account</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <span className="big">Sugilanon</span>
          <span>Bisaya for story. App Dev final exam project.</span>
        </div>
      </footer>
    </>
  );
}
