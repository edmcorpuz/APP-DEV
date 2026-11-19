import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, Sunburst } from './Story.jsx';
import MuralStage from './MuralStage.jsx';
import { stopMusic } from '../audio/warDrums.js';

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
  const location = useLocation();
  const { pathname } = location;
  const outlet = useOutlet();
  const [menuOpen, setMenuOpen] = useState(false);
  const canWrite = user && ['author', 'admin'].includes(user.role);

  useEffect(() => setMenuOpen(false), [pathname]);
  // The war drums belong to the story; they fade out anywhere else.
  useEffect(() => { if (pathname !== '/sugilanon/lapu-lapu') stopMusic(); }, [pathname]);
  // A new page starts at the top once the old one has left; smoothly while the mural morphs.
  const toTop = () => window.scrollTo({ top: 0, behavior: location.state?.morph ? 'smooth' : 'auto' });
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
    <div className="app">
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="wordmark"><Sunburst className="" />Sugilanon</Link>
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
            <NavLink to="/" end>Stories</NavLink>
            {user && <NavLink to="/me">My stories</NavLink>}
            {canWrite && <NavLink to="/new">Write a story</NavLink>}
            <ThemeToggle />
            {user ? (
              <>
                <span className="who">{user.username}&nbsp;<span>({user.role})</span></span>
                <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/register">Create account</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="wrap">
        {/* Pages cross-fade (opacity only, so nothing shifts under the mural while it measures). */}
        <AnimatePresence mode="wait" initial={false} onExitComplete={toTop}>
          <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.45 } }} exit={{ opacity: 0, transition: { duration: 0.22 } }}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <MuralStage />
      <footer className="site-footer">
        <div className="waves" aria-hidden="true" />
        <div className="wrap">
          <Sunburst className="" />
          <span className="big"><Ceb className="">Salamat sa pagbasa</Ceb></span>
          <span>Thank you for reading.</span>
          <span className="small">Sugilanon, Bisaya for story. App Dev final exam project.</span>
        </div>
      </footer>
    </div>
  );
}
