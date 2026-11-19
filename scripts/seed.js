// Fills the database with demo accounts and posts THROUGH THE REAL APIs (so hashing, tokens and
// role checks all run). Both servers must be running. Safe to run twice.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const AUTH = `http://localhost:${process.env.AUTH_PORT || 4000}`;
const BLOG = `http://localhost:${process.env.BLOG_PORT || 5000}/api`;
const PASSWORD = 'StoryTime123!'; // local demo password only

const accounts = [
  { username: 'clara_reader', email: 'clara@blog.local', role: 'reader', posts: [] },
  {
    username: 'mika_author', email: 'mika@blog.local', role: 'author', posts: [
      ['Sunday market in Cebu', 'Mangoes, puso, and the loudest fish vendor I have ever met. A short guide to getting there early.'],
      ['Learning Express in a week', 'Routes, controllers, middleware. Once the request/response cycle clicks, everything else follows.'],
    ],
  },
  {
    username: 'eli_author', email: 'eli@blog.local', role: 'author', posts: [
      ['Why I keep a paper notebook', 'Screens are great for storing ideas. Paper is better for having them.'],
    ],
  },
  {
    username: 'sam_admin', email: 'sam@blog.local', role: 'admin', posts: [
      ['Welcome to the blog', 'Readers can browse, authors can write, and admins keep things tidy. Be kind in the comments.'],
    ],
  },
];

async function call(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

try {
  for (const account of accounts) {
    const { posts, ...details } = account;
    const reg = await call(`${AUTH}/register`, { method: 'POST', body: JSON.stringify({ ...details, password: PASSWORD }) });
    console.log(`${account.username}: ${reg.status === 201 ? 'created' : reg.status === 409 ? 'already exists' : reg.data.error}`);
    if (!posts.length) continue;

    const auth = await call(`${AUTH}/login`, { method: 'POST', body: JSON.stringify({ username: account.username, password: PASSWORD }) });
    if (auth.status !== 200) { console.log(`  could not log in: ${auth.data.error}`); continue; }
    const headers = { Authorization: `Bearer ${auth.data.accessToken}` };

    const mine = await call(`${BLOG}/me/posts`, { headers });
    const existing = new Set(mine.data.map(post => post.title));
    for (const [title, content] of posts) {
      if (existing.has(title)) continue;
      const created = await call(`${BLOG}/posts`, { method: 'POST', headers, body: JSON.stringify({ title, content }) });
      console.log(`  post "${title}": ${created.status === 201 ? 'created' : created.data.error}`);
    }
    await call(`${AUTH}/logout`, { method: 'POST', body: JSON.stringify({ refreshToken: auth.data.refreshToken }) });
  }
  console.log(`\nDone. Demo password for every account: ${PASSWORD}`);
} catch (error) {
  console.error(`Seeding failed: ${error.message}. Are both servers running (npm run dev)?`);
  process.exit(1);
}
