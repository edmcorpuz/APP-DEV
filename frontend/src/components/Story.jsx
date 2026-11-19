import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import lapulapuSvg from '../art/lapulapu.svg?raw';
import { loadLapuLapu } from '../lapulapuPage.js';

export const formatDate = value => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric',
});

// Real numbers only: both are computed from the post itself.
export const readTime = text => `${Math.max(1, Math.round(text.trim().split(/\s+/).length / 200))} min read`;
export const excerpt = (text, max) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

// The headline shares a view-transition name with the article <h1>, so it glides into place.
export const titleTransition = id => ({ viewTransitionName: `story-title-${id}` });

// Bisaya (Cebuano) words, marked so screen readers switch pronunciation.
export const Ceb = ({ children, className = 'ceb' }) => <span lang="ceb" className={className}>{children}</span>;

// Half sun with eight main rays: the Deco fan and the eight-rayed sun of the flag.
const RAYS = Array.from({ length: 8 }, (_, k) => Math.PI + (Math.PI * (k + 1)) / 9);
export function Sunburst({ className = 'ornament' }) {
  return (
    <svg className={className} viewBox="0 0 64 34" aria-hidden="true" focusable="false">
      {RAYS.map((a, k) => (
        <line key={k} x1={32 + Math.cos(a) * 13} y1={32 + Math.sin(a) * 13} x2={32 + Math.cos(a) * 30} y2={32 + Math.sin(a) * 30}
          stroke="currentColor" strokeWidth={k % 2 ? 1.6 : 2.6} strokeLinecap="square" />
      ))}
      <path d="M21 32a11 11 0 0 1 22 0Z" fill="currentColor" />
      <line x1="2" y1="33" x2="62" y2="33" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// The two murals (frontend/art/murals.mjs). Captions state only well-documented history.
const MURALS = {
  lapulapu: {
    title: 'Lapu-Lapu of Mactan',
    caption: 'Led the warriors of Mactan who defeated Magellan’s force in 1521. Mindanao vintas sail beside him.',
  },
  kudarat: {
    title: 'Sultan Kudarat of Maguindanao',
    caption: 'Ruled in the 1600s and resisted Spanish rule in Mindanao. Shown beneath a torogan roof.',
  },
};

// Inline SVG (our own generated file) so CSS can animate its layers; decorative, so hidden from
// screen readers while the link carries the accessible name.
export const MuralArt = ({ svg }) => <span className="mural-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;

export function Mural({ name, priority = false }) {
  const { title, caption } = MURALS[name];
  if (name === 'lapulapu') {
    return (
      <figure className="mural">
        <Link to="/sugilanon/lapu-lapu" viewTransition className="arch mural-link" style={{ viewTransitionName: 'mural-hero' }}
          aria-label={`${title}: open his story`} onPointerEnter={loadLapuLapu} onFocus={loadLapuLapu}>
          <MuralArt svg={lapulapuSvg} />
        </Link>
        <figcaption>
          <strong>{title}</strong>{caption}
          <span className="hint">Hover the mural to wake it. Open it to read his <Ceb className="">sugilanon</Ceb>.</span>
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="mural">
      <motion.div className="arch" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <img src={`${import.meta.env.BASE_URL}art/${name}.png`} alt={`Art Deco illustration of ${title}`} width="960" height="1200" fetchpriority={priority ? 'high' : 'auto'} />
      </motion.div>
      <figcaption><strong>{title}</strong>{caption}</figcaption>
    </figure>
  );
}

// Rows take their seats in order, then everything is still.
const list = { hidden: {}, shown: { transition: { staggerChildren: 0.07 } } };
const row = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
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

export function SectionHead({ ceb, en, as: Tag = 'h2' }) {
  return (
    <div className="section-head plate">
      <div>
        <Tag><Ceb className="">{ceb}</Ceb></Tag>
        <span className="label">{en}</span>
      </div>
    </div>
  );
}

export function LeadStory({ post }) {
  return (
    <motion.article className="lead" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
      <Sunburst />
      <span className="tag label"><Ceb className="">Bag-o</Ceb><span aria-hidden="true">·</span>Latest</span>
      <h2 style={titleTransition(post.id)}>
        <Link to={`/posts/${post.id}`} viewTransition>{post.title}</Link>
      </h2>
      <p className="excerpt">{excerpt(post.content, 240)}</p>
      <p className="meta">By {post.authorName} · {readTime(post.content)}</p>
    </motion.article>
  );
}

// layout + AnimatePresence: when search filters the list, remaining rows slide into place.
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
      <span aria-hidden="true" style={{ width: '45%' }} />
      <span aria-hidden="true" style={{ width: '75%' }} />
    </div>
  );
}
