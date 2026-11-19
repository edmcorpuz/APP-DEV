import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { LeadStory, StoryIndex, StoriesSkeleton } from '../components/Story.jsx';

const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

// Public: GET /api/posts works without logging in.
export default function Feed() {
  const { api, user } = useAuth();
  const { state } = useLocation();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setError('');
    setPosts(null);
    api('/posts').then(setPosts).catch(err => setError(err.message));
  }, [api]);
  useEffect(load, [load]);

  const q = query.trim().toLowerCase();
  const results = (posts || []).filter(post =>
    !q || post.title.toLowerCase().includes(q) || post.authorName.toLowerCase().includes(q));
  const canWrite = user && ['author', 'admin'].includes(user.role);

  return (
    <>
      <section className="masthead">
        <h1>Sugilanon</h1>
        <p className="dek">Bisaya for story. Short reads from our authors, open to anyone.</p>
        <hr className="double-rule" />
        <div className="dateline">
          <span>{today}</span>
          {posts && <span className="num">{posts.length} {posts.length === 1 ? 'story' : 'stories'}</span>}
          <div className="search">
            <label htmlFor="search">Search</label>
            <input id="search" type="search" placeholder="Title or author" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
      </section>

      {state?.notice && <p className="notice" role="status" style={{ marginTop: 24 }}>{state.notice}</p>}

      {error && (
        <div className="state" role="alert">
          <h2>The stories didn't load.</h2>
          <p>{error}</p>
          <button type="button" className="button" onClick={load}>Try again</button>
        </div>
      )}

      {!posts && !error && <StoriesSkeleton />}

      {posts && posts.length === 0 && (
        <div className="state">
          <h2>No stories yet.</h2>
          <p>{canWrite ? 'The front page is yours. Publish the first story.' : 'Authors publish here. Create an author account to write the first one.'}</p>
          <Link to={canWrite ? '/new' : '/register'} className="button primary">
            {canWrite ? 'Write the first story' : 'Create an author account'}
          </Link>
        </div>
      )}

      {posts && posts.length > 0 && q && (
        results.length ? (
          <>
            <div className="section-head"><h2>Results for “{query.trim()}”</h2><span className="meta num">{results.length} found</span></div>
            <StoryIndex posts={results} showExcerpt />
          </>
        ) : (
          <div className="state">
            <h2>Nothing matches “{query.trim()}”.</h2>
            <p>Search looks at titles and author names.</p>
            <button type="button" className="button ghost" onClick={() => setQuery('')}>Clear search</button>
          </div>
        )
      )}

      {posts && posts.length > 0 && !q && (
        <>
          <LeadStory post={posts[0]} />
          {posts.length > 1 && (
            <>
              <div className="section-head"><h2>More stories</h2></div>
              <StoryIndex posts={posts.slice(1)} start={2} />
            </>
          )}
        </>
      )}
    </>
  );
}
