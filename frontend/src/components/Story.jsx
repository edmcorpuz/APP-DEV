import { Link } from 'react-router-dom';

export const formatDate = value => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric',
});

// Real numbers only: both are computed from the post itself.
export const readTime = text => `${Math.max(1, Math.round(text.trim().split(/\s+/).length / 200))} min read`;
export const excerpt = (text, max) => (text.length > max ? `${text.slice(0, max).trim()}…` : text);

// The headline shares a view-transition name with the article <h1>, so it glides into place.
export const titleTransition = id => ({ viewTransitionName: `story-title-${id}` });

export function Byline({ post }) {
  return (
    <p className="meta">
      By {post.authorName} · <time dateTime={post.created_at}>{formatDate(post.created_at)}</time> · {readTime(post.content)}
    </p>
  );
}

export function LeadStory({ post }) {
  return (
    <article className="lead">
      <div className="head">
        <p className="kicker">Latest</p>
        <h2 style={titleTransition(post.id)}>
          <Link to={`/posts/${post.id}`} viewTransition>{post.title}</Link>
        </h2>
      </div>
      <div className="aside">
        <p className="excerpt">{excerpt(post.content, 260)}</p>
        <p className="meta" style={{ marginTop: 16 }}>
          By {post.authorName} · {readTime(post.content)}
        </p>
      </div>
    </article>
  );
}

export function StoryIndex({ posts, start = 1, showExcerpt = false }) {
  return (
    <ol className="index">
      {posts.map((post, i) => (
        <li key={post.id} className="row">
          <span className="num" aria-hidden="true">{String(start + i).padStart(2, '0')}</span>
          <h3 style={titleTransition(post.id)}>
            <Link to={`/posts/${post.id}`} viewTransition>{post.title}</Link>
          </h3>
          <Byline post={post} />
          {showExcerpt && <p className="excerpt">{excerpt(post.content, 160)}</p>}
        </li>
      ))}
    </ol>
  );
}

export function StoriesSkeleton() {
  return (
    <div className="skeleton" aria-busy="true">
      <span className="sr-only">Loading stories…</span>
      <span className="big" aria-hidden="true" />
      <span aria-hidden="true" style={{ width: '55%' }} />
      <span aria-hidden="true" style={{ width: '85%' }} />
      <span aria-hidden="true" style={{ width: '40%' }} />
    </div>
  );
}
