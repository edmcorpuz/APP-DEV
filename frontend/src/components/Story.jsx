import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

export const formatDate = value => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric',
});

// Real numbers only: both are computed from the post itself.
export const readTime = text => `${Math.max(1, Math.round(text.trim().split(/\s+/).length / 200))} min read`;
export const excerpt = (text, max) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

// The headline shares a view-transition name with the article <h1>, so it glides into place.
export const titleTransition = id => ({ viewTransitionName: `story-title-${id}` });

// Rows arrive in order like a press laying down lines, then settle without wobble.
const list = { hidden: {}, shown: { transition: { staggerChildren: 0.06 } } };
const row = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.9, 0.1, 1] } },
};

export function Byline({ post }) {
  return (
    <p className="meta">
      By {post.authorName} · <time dateTime={post.created_at}>{formatDate(post.created_at)}</time> · {readTime(post.content)}
    </p>
  );
}

export function Notice({ children }) {
  return (
    <motion.p className="notice" role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.p>
  );
}

export function LeadStory({ post }) {
  return (
    <motion.article className="lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15, ease: [0.2, 0.9, 0.1, 1] }}>
      <div className="head">
        <span className="tag">Latest</span>
        <h2 style={titleTransition(post.id)}>
          <Link to={`/posts/${post.id}`} viewTransition>{post.title}</Link>
        </h2>
      </div>
      <div className="aside">
        <p className="excerpt">{excerpt(post.content, 260)}</p>
        <p className="meta" style={{ marginTop: 16 }}>By {post.authorName} · {readTime(post.content)}</p>
      </div>
    </motion.article>
  );
}

// layout + AnimatePresence: when search filters the list, remaining rows slide into place
// instead of jumping, and removed rows fade out, so you can see what the filter did.
export function StoryIndex({ posts, start = 1, showExcerpt = false }) {
  return (
    <motion.ol className="index" variants={list} initial="hidden" animate="shown">
      <AnimatePresence initial={false} mode="popLayout">
        {posts.map((post, i) => (
          <motion.li key={post.id} className="row" layout variants={row} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <span className="num" aria-hidden="true">{String(start + i).padStart(2, '0')}</span>
            <h3 style={titleTransition(post.id)}>
              <Link to={`/posts/${post.id}`} viewTransition>{post.title}</Link>
            </h3>
            <Byline post={post} />
            {showExcerpt && <p className="excerpt">{excerpt(post.content, 160)}</p>}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ol>
  );
}

export function StoriesSkeleton({ label = 'Loading stories…' }) {
  return (
    <div className="skeleton" aria-busy="true">
      <span className="sr-only">{label}</span>
      <span className="big" aria-hidden="true" />
      <span aria-hidden="true" style={{ width: '55%' }} />
      <span aria-hidden="true" style={{ width: '85%' }} />
      <span aria-hidden="true" style={{ width: '40%' }} />
    </div>
  );
}
