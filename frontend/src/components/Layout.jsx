import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canWrite = user && ['author', 'admin'].includes(user.role);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="brand">Sugilanon</Link>
          <nav>
            <NavLink to="/" end>Stories</NavLink>
            {user && <NavLink to="/me">My posts</NavLink>}
            {canWrite && <NavLink to="/new">Write</NavLink>}
            {user ? (
              <>
                <span className="who">{user.username} <span className={`role role-${user.role}`}>{user.role}</span></span>
                <button type="button" className="link-button" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <NavLink to="/register" className="button small">Sign up</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="wrap site-footer">React → Express (Auth :4000, Blog :5000) → MariaDB</footer>
    </>
  );
}
