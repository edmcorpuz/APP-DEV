import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { SectionHead, StoryIndex, StoriesSkeleton } from '../components/Story.jsx';

// GET /api/me/posts: any logged-in user, returns only their own posts.
export default function MyPosts() {
  const { api, user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setPosts(null);
    api('/me/posts').then(setPosts).catch(err => setError(err.message));
  }, [api]);
  useEffect(load, [load]);

  const canWrite = ['author', 'admin'].includes(user.role);

  return (
    <>
      <div style={{ paddingTop: 40 }}>
        <SectionHead as="h1" ceb="Akong mga sugilanon" en="My stories" />
      </div>
      {canWrite && <p style={{ textAlign: 'center', margin: '0 0 28px' }}><Link to="/new" className="button primary">Write a story</Link></p>}

      {error && (
        <div className="state" role="alert">
          <h2>Your stories didn't load.</h2>
          <p>{error}</p>
          <button type="button" className="button" onClick={load}>Try again</button>
        </div>
      )}
      {!posts && !error && <StoriesSkeleton />}
      {posts && posts.length === 0 && (
        <div className="state">
          <h2>{canWrite ? 'Nothing published yet.' : 'Readers don\'t publish.'}</h2>
          <p>{canWrite ? 'Your stories show up here once you publish them.' : 'Your account can read every story. To write, create an author account.'}</p>
          {canWrite
            ? <Link to="/new" className="button primary">Write your first story</Link>
            : <Link to="/" className="button">Read the latest stories</Link>}
        </div>
      )}
      {posts && posts.length > 0 && <StoryIndex posts={posts} showExcerpt />}
    </>
  );
}
