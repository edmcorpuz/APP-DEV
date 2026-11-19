import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { loadLapuLapu, getLapuLapu } from './lapulapuPage.js';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Feed from './pages/Feed.jsx';
import PostView from './pages/PostView.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import MyPosts from './pages/MyPosts.jsx';
import PostEditor from './pages/PostEditor.jsx';

// Hides pages from the wrong users. This is only for the UI; the Blog API enforces the real rules.
function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="skeleton" aria-busy="true"><span className="sr-only">Checking your session…</span></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <Message title="Authors only.">
        Your account is a {user.role}, so it can read stories but not write them.
      </Message>
    );
  }
  return children;
}

function Message({ title, children }) {
  return (
    <div className="state">
      <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>{title}</h1>
      <p>{children}</p>
      <Link to="/" className="button" viewTransition>Back to all stories</Link>
    </div>
  );
}

// The Lapu-Lapu page carries a large panorama, so it is its own chunk. It is preloaded while the
// home page is idle (and on hover), so the arch-to-panorama morph never lands on a loading state.
const LazyLapuLapu = lazy(loadLapuLapu);
function LapuLapuRoute() {
  const Page = getLapuLapu();
  if (Page) return <Page />;
  return <Suspense fallback={<div className="skeleton" aria-busy="true"><span className="sr-only">Loading the story…</span></div>}><LazyLapuLapu /></Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="posts/:id" element={<PostView />} />
        <Route path="sugilanon/lapu-lapu" element={<LapuLapuRoute />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="me" element={<RequireAuth><MyPosts /></RequireAuth>} />
        <Route path="new" element={<RequireAuth roles={['author', 'admin']}><PostEditor /></RequireAuth>} />
        <Route path="posts/:id/edit" element={<RequireAuth><PostEditor /></RequireAuth>} />
        <Route path="*" element={<Message title="Page not found.">That address doesn't match any page on Sugilanon.</Message>} />
      </Route>
    </Routes>
  );
}
