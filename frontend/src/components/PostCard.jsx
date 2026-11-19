import { Link } from 'react-router-dom';

export const formatDate = value => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric',
});

export default function PostCard({ post }) {
  const excerpt = post.content.length > 180 ? `${post.content.slice(0, 180).trim()}…` : post.content;
  return (
    <article className="card">
      <h2><Link to={`/posts/${post.id}`}>{post.title}</Link></h2>
      <p className="meta">by {post.authorName} · {formatDate(post.created_at)}</p>
      <p>{excerpt}</p>
    </article>
  );
}
