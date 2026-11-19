import { pool } from '../../db.js';

// Join users so every post comes back with its author's username.
const SELECT_POST = `
  SELECT p.id, p.author_id AS authorId, u.username AS authorName,
         p.title, p.content, p.created_at, p.updated_at
    FROM posts p
    JOIN users u ON u.id = p.author_id`;

const isText = value => typeof value === 'string' && value.trim().length > 0;
const parseId = value => (/^[1-9]\d{0,9}$/.test(value) ? Number(value) : null);

async function findPost(id) {
  const [[post]] = await pool.query(`${SELECT_POST} WHERE p.id = ?`, [id]);
  return post;
}

// Checks title/content. partial = true for updates (only the sent fields are checked).
function validate(body, partial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Please send a JSON object.';
  const has = field => Object.hasOwn(body, field);
  if (partial && !has('title') && !has('content')) return 'Send a title or content to update.';
  if ((!partial || has('title')) && !isText(body.title)) return 'Title is required.';
  if ((!partial || has('content')) && !isText(body.content)) return 'Content is required.';
  if (has('title') && body.title.trim().length > 255) return 'Title must be 255 characters or fewer.';
  if (has('content') && body.content.length > 60000) return 'Content is too long.';
  return null;
}

// GET /api/posts  (public)
export async function listPosts(req, res) {
  const [rows] = await pool.query(`${SELECT_POST} ORDER BY p.created_at DESC, p.id DESC`);
  res.json(rows);
}

// GET /api/posts/:id  (public)
export async function getPost(req, res) {
  const id = parseId(req.params.id);
  const post = id && await findPost(id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json(post);
}

// POST /api/posts  (author, admin). authorId comes from the token, never the body.
export async function createPost(req, res) {
  const error = validate(req.body, false);
  if (error) return res.status(400).json({ error });
  const [result] = await pool.query(
    'INSERT INTO posts (author_id, title, content) VALUES (?, ?, ?)',
    [req.user.id, req.body.title.trim(), req.body.content.trim()],
  );
  res.status(201).json(await findPost(result.insertId));
}

// PUT /api/posts/:id  (post owner or admin)
export async function updatePost(req, res) {
  const id = parseId(req.params.id);
  const post = id && await findPost(id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  // Ownership check: only the author of this post, or an admin.
  if (post.authorId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the post owner or an admin can edit this post.' });
  }
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ error });

  const title = Object.hasOwn(req.body, 'title') ? req.body.title.trim() : post.title;
  const content = Object.hasOwn(req.body, 'content') ? req.body.content.trim() : post.content;
  await pool.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id]);
  res.json(await findPost(id));
}

// DELETE /api/posts/:id  (admin)
export async function deletePost(req, res) {
  const id = parseId(req.params.id);
  const [result] = id ? await pool.query('DELETE FROM posts WHERE id = ?', [id]) : [{ affectedRows: 0 }];
  if (!result.affectedRows) return res.status(404).json({ error: 'Post not found.' });
  res.json({ message: 'Post deleted.', id });
}

// GET /api/me/posts  (any logged-in user)
export async function myPosts(req, res) {
  const [rows] = await pool.query(
    `${SELECT_POST} WHERE p.author_id = ? ORDER BY p.created_at DESC, p.id DESC`, [req.user.id],
  );
  res.json(rows);
}
