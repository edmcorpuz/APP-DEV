import { randomUUID } from 'node:crypto';
import { posts, savePosts } from '../models/posts.js';
import { isText } from '../../../shared/http.js';

export const listPosts = (req, res) => res.json([...posts].reverse());
export const myPosts = (req, res) => res.json(posts.filter(post => post.authorId === req.user.id).reverse());
export function getPost(req, res) {
  const post = posts.find(post => post.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'This story could not be found.' });
  res.json(post);
}
function validatePost(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Please send a JSON object.';
  const fields = ['title', 'content'];
  if (partial && !fields.some(field => Object.hasOwn(body, field))) return 'Provide a title or content to update.';
  for (const field of fields) {
    if (partial && !Object.hasOwn(body, field)) continue;
    if (!isText(body[field])) return 'The ' + field + ' cannot be empty.';
    if (body[field].length > (field === 'title' ? 150 : 20000)) return 'The ' + field + ' is too long.';
  }
}
export function createPost(req, res) {
  const error = validatePost(req.body);
  if (error) return res.status(400).json({ error });
  // Gikan sa verified token ang owner, dili sa form. Prevents impersonation.
  const post = { id: randomUUID(), authorId: req.user.id, authorName: req.user.username,
    title: req.body.title.trim(), content: req.body.content.trim(),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  posts.push(post);
  savePosts();
  res.status(201).json(post);
}
export function updatePost(req, res) {
  const post = posts.find(post => post.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'This story could not be found.' });
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the story owner or an admin can edit this story.' });
  }
  const error = validatePost(req.body, true);
  if (error) return res.status(400).json({ error });
  for (const field of ['title', 'content']) {
    if (Object.hasOwn(req.body, field)) post[field] = req.body[field].trim();
  }
  post.updated_at = new Date().toISOString();
  savePosts();
  res.json(post);
}
export function deletePost(req, res) {
  const index = posts.findIndex(post => post.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'This story could not be found.' });
  posts.splice(index, 1);
  savePosts();
  res.json({ message: 'The story has been deleted.' });
}
