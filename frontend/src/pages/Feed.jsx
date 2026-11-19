import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext.jsx';
import { Ceb, LeadStory, Mural, Notice, SectionHead, StoryIndex, StoriesSkeleton } from '../components/Story.jsx';

const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const NAME = 'Sugilanon';
const ease = [0.22, 1, 0.36, 1];

// The masthead is the focal point: letters settle one by one, like a marquee being lit.
function Masthead() {
  return (
    <h1 aria-label={NAME}>
      {[...NAME].map((letter, i) => (
        <motion.span key={i} aria-hidden="true" initial={{ opacity: 0, y: '0.25em' }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.045, ease }}>
          {letter}
        </motion.span>
      ))}
    </h1>
  );
}

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
        <p className="kicker label plate"><span>Bisaya · <Ceb className="">istorya</Ceb> · story</span></p>
        <Masthead />
        <p className="dek">
          <Ceb>Mga sugilanon gikan sa among mga magsusulat.</Ceb>
          Stories from our writers, open to anyone.
        </p>

        <div className="facade">
          <div className="pillar">
            <span className="label">{today}</span>
            <span className="count">{posts ? posts.length : '·'}</span>
            <span className="meta">{posts?.length === 1 ? 'story published' : 'stories published'}</span>
          </div>
          <Mural name="lapulapu" />
          <div className="pillar search">
            <label htmlFor="search" className="label">Search · <Ceb className="">Pangitaa</Ceb></label>
            <input id="search" type="search" placeholder="Title or author" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
      </section>
      <div className="waves" aria-hidden="true" />

      {state?.notice && <div style={{ textAlign: 'center' }}><Notice>{state.notice}</Notice></div>}

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
          <div style={{ marginTop: 48 }}>
            <SectionHead ceb={`“${query.trim()}”`} en={`${results.length} found`} />
            <StoryIndex posts={results} showExcerpt />
          </div>
        ) : (
          <div className="state">
            <h2>Nothing matches “{query.trim()}”.</h2>
            <p>Search looks at titles and author names.</p>
            <button type="button" className="button" onClick={() => setQuery('')}>Clear search</button>
          </div>
        )
      )}

      {posts && posts.length > 0 && !q && (
        <>
          <LeadStory post={posts[0]} />
          {posts.length > 1 && (
            <>
              <SectionHead ceb="Uban pang mga sugilanon" en="More stories" />
              <StoryIndex posts={posts.slice(1)} start={2} />
            </>
          )}
        </>
      )}
    </>
  );
}
