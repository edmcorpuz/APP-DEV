import { Navigate, Route, Routes } from 'react-router-dom';
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
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <p className="notice">Your role ({user.role}) can't open this page.</p>;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="posts/:id" element={<PostView />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="me" element={<RequireAuth><MyPosts /></RequireAuth>} />
        <Route path="new" element={<RequireAuth roles={['author', 'admin']}><PostEditor /></RequireAuth>} />
        <Route path="posts/:id/edit" element={<RequireAuth><PostEditor /></RequireAuth>} />
        <Route path="*" element={<p className="notice">Page not found.</p>} />
      </Route>
    </Routes>
  );
}
