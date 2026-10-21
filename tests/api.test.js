import { test, expect, beforeAll, afterAll } from 'bun:test';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fixture, call } from './helpers.js';
let app;
const accounts = {};
const password = 'ClassroomPass123!';
let storyId;

beforeAll(async () => {
  app = await fixture(14000, 15000);
  for (const role of ['reader', 'author', 'admin']) {
    const result = await call(app.auth, '/register', 'POST', { username: role + '_demo', password, role });
    expect(result.status).toBe(201);
    accounts[role] = { user: result.data.user, ...(await call(app.auth, '/login', 'POST', { username: role + '_demo', password })).data };
  }
  await call(app.auth, '/register', 'POST', { username: 'second_author', password, role: 'author' });
  accounts.other = (await call(app.auth, '/login', 'POST', { username: 'second_author', password })).data;
}, 20000);
afterAll(async () => { await app?.cleanup(); });

test('both health endpoints and public reads need no token', async () => {
  expect((await call(app.auth, '/health')).status).toBe(200);
  expect((await call(app.blog, '/health')).status).toBe(200);
  const result = await call(app.blog, '/api/posts');
  expect(result).toEqual({ status: 200, data: [] });
  expect((await call(app.blog, '/api/posts/missing')).status).toBe(404);
});
test('register validates missing fields, types, roles and username collisions', async () => {
  for (const body of [{}, { username: 'new', password }, { username: 'new', password, role: 'hacker' },
    { username: 123, password, role: 'reader' }, { username: 'new', password: 'short', role: 'reader' }, []]) {
    expect((await call(app.auth, '/register', 'POST', body)).status).toBe(400);
  }
  expect((await call(app.auth, '/register', 'POST', { username: 'AUTHOR_DEMO', password, role: 'author' })).status).toBe(409);
});
test('login rejects missing and incorrect credentials without leaking user records', async () => {
  expect((await call(app.auth, '/login', 'POST', {})).status).toBe(400);
  expect((await call(app.auth, '/login', 'POST', { username: 'author_demo', password: 'incorrect' })).status).toBe(401);
  expect((await call(app.auth, '/login', 'POST', { username: 'does_not_exist', password })).status).toBe(401);
  expect(accounts.author.user.hashed_password).toBeUndefined();
});
test('JWT claims and lifetimes match the assignment exactly', () => {
  const access = jwt.verify(accounts.author.accessToken, app.secret);
  const refresh = jwt.verify(accounts.author.refreshToken, app.secret);
  expect(access.id).toBe(accounts.author.user.id);
  expect(access.username).toBe('author_demo');
  expect(access.role).toBe('author');
  expect(access.exp - access.iat).toBe(15 * 60);
  expect(refresh.exp - refresh.iat).toBe(7 * 24 * 60 * 60);
  expect(refresh.type).toBe('refresh');
});
test('saved user schema uses salted native crypto hashes, not plaintext', () => {
  const users = JSON.parse(readFileSync(path.join(app.storage, 'users', 'users'), 'utf8'));
  const user = users.find(user => user.username === 'author_demo');
  expect(Object.keys(user).sort()).toEqual(['id', 'username', 'hashed_password', 'role', 'refresh_token', 'created_at', 'revoked_at'].sort());
  expect(user.hashed_password).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  expect(user.hashed_password).not.toContain(password);
  expect(user.hashed_password).not.toBe(users[0].hashed_password);
  expect(user.revoked_at).toBeNull();
  expect(user.refresh_token).toBe(accounts.author.refreshToken);
});
test('protected endpoints reject absent, malformed, tampered, expired and refresh JWTs', async () => {
  const expired = jwt.sign({ id: accounts.author.user.id, username: 'author_demo', role: 'author' }, app.secret, { expiresIn: -1 });
  const forged = jwt.sign({ id: accounts.author.user.id, username: 'author_demo', role: 'admin' }, 'wrong-secret');
  for (const token of [undefined, 'nonsense', expired, forged, accounts.author.refreshToken]) {
    expect((await call(app.blog, '/api/me/posts', 'GET', undefined, token)).status).toBe(401);
    expect((await call(app.blog, '/api/posts', 'POST', { title: 'Bad', content: 'Bad' }, token)).status).toBe(401);
  }
});
test('reader can list own posts but cannot publish or delete', async () => {
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.reader.accessToken)).data).toEqual([]);
  expect((await call(app.blog, '/api/posts', 'POST', { title: 'No', content: 'No' }, accounts.reader.accessToken)).status).toBe(403);
  expect((await call(app.blog, '/api/posts/any', 'DELETE', undefined, accounts.reader.accessToken)).status).toBe(403);
});
test('author creates a post; server ignores spoofed authorId and authorName', async () => {
  const result = await call(app.blog, '/api/posts', 'POST', { title: '  First story  ', content: 'A real story for our tests.',
    authorId: accounts.admin.user.id, authorName: 'Impersonated' }, accounts.author.accessToken);
  expect(result.status).toBe(201);
  expect(result.data.title).toBe('First story');
  expect(result.data.authorId).toBe(accounts.author.user.id);
  expect(result.data.authorName).toBe('author_demo');
  storyId = result.data.id;
});
test('public detail and all-post views include the saved story', async () => {
  expect((await call(app.blog, '/api/posts/' + storyId)).data.title).toBe('First story');
  expect((await call(app.blog, '/api/posts')).data).toHaveLength(1);
});
test('create and update validate whitespace, types, lengths and empty updates', async () => {
  for (const body of [{}, { title: ' ', content: 'text' }, { title: 'x', content: 5 },
    { title: 'x'.repeat(151), content: 'text' }, { title: 'x', content: 'x'.repeat(20001) }]) {
    expect((await call(app.blog, '/api/posts', 'POST', body, accounts.author.accessToken)).status).toBe(400);
  }
  for (const body of [{}, { title: '' }, { content: [] }, { role: 'admin' }]) {
    expect((await call(app.blog, '/api/posts/' + storyId, 'PUT', body, accounts.author.accessToken)).status).toBe(400);
  }
});
test('owner can partially edit; other authors and readers cannot', async () => {
  const updated = await call(app.blog, '/api/posts/' + storyId, 'PUT', { title: 'Updated title', authorId: 'fake' }, accounts.author.accessToken);
  expect(updated.status).toBe(200);
  expect(updated.data.content).toBe('A real story for our tests.');
  expect(updated.data.authorId).toBe(accounts.author.user.id);
  for (const token of [accounts.other.accessToken, accounts.reader.accessToken]) {
    expect((await call(app.blog, '/api/posts/' + storyId, 'PUT', { title: 'Not mine' }, token)).status).toBe(403);
  }
});
test('my posts filters by identity and does not show everyone’s stories', async () => {
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.author.accessToken)).data).toHaveLength(1);
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.other.accessToken)).data).toHaveLength(0);
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.admin.accessToken)).data).toHaveLength(0);
});
test('admin can publish and edit another person’s post without changing ownership', async () => {
  const created = await call(app.blog, '/api/posts', 'POST', { title: 'Admin story', content: 'Also a writer.' }, accounts.admin.accessToken);
  expect(created.status).toBe(201);
  const updated = await call(app.blog, '/api/posts/' + storyId, 'PUT', { content: 'Reviewed by admin.' }, accounts.admin.accessToken);
  expect(updated.status).toBe(200);
  expect(updated.data.authorId).toBe(accounts.author.user.id);
});
test('refresh accepts only valid saved refresh tokens, not access or expired tokens', async () => {
  const result = await call(app.auth, '/refresh', 'POST', { refreshToken: accounts.author.refreshToken });
  expect(result.status).toBe(200);
  expect(jwt.verify(result.data.accessToken, app.secret).role).toBe('author');
  expect((await call(app.auth, '/refresh', 'POST', {})).status).toBe(400);
  for (const token of [accounts.author.accessToken, 'invalid', jwt.sign({ id: accounts.author.user.id, type: 'refresh' }, app.secret, { expiresIn: -1 })]) {
    expect((await call(app.auth, '/refresh', 'POST', { refreshToken: token })).status).toBe(401);
  }
});
test('logging in again replaces the earlier refresh token, even in the same second', async () => {
  const first = (await call(app.auth, '/login', 'POST', { username: 'second_author', password })).data;
  const second = (await call(app.auth, '/login', 'POST', { username: 'second_author', password })).data;
  expect(first.refreshToken).not.toBe(second.refreshToken);
  expect((await call(app.auth, '/refresh', 'POST', { refreshToken: first.refreshToken })).status).toBe(401);
  expect((await call(app.auth, '/refresh', 'POST', { refreshToken: second.refreshToken })).status).toBe(200);
});
test('Blog API stays independent while Auth is stopped', async () => {
  await app.stop('auth-server');
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.author.accessToken)).status).toBe(200);
  const result = await call(app.blog, '/api/posts/' + storyId, 'PUT', { title: 'Auth is offline; Blog still works' }, accounts.author.accessToken);
  expect(result.status).toBe(200);
  await app.start('auth-server');
});
test('users, passwords and posts survive server restarts', async () => {
  await app.stop('blog-api');
  await app.start('blog-api');
  expect((await call(app.blog, '/api/posts/' + storyId)).data.title).toBe('Auth is offline; Blog still works');
  expect((await call(app.auth, '/refresh', 'POST', { refreshToken: accounts.author.refreshToken })).status).toBe(200);
  expect((await call(app.auth, '/login', 'POST', { username: 'reader_demo', password })).status).toBe(200);
});
test('logout clears refresh_token, sets revoked_at, and leaves access valid until expiry', async () => {
  expect((await call(app.auth, '/logout', 'POST', {})).status).toBe(400);
  expect((await call(app.auth, '/logout', 'POST', { refreshToken: accounts.author.refreshToken })).status).toBe(200);
  expect((await call(app.auth, '/refresh', 'POST', { refreshToken: accounts.author.refreshToken })).status).toBe(401);
  const users = JSON.parse(readFileSync(path.join(app.storage, 'users', 'users'), 'utf8'));
  const user = users.find(user => user.id === accounts.author.user.id);
  expect(user.refresh_token).toBeNull();
  expect(user.revoked_at).toBeString();
  expect((await call(app.blog, '/api/me/posts', 'GET', undefined, accounts.author.accessToken)).status).toBe(200);
  expect((await call(app.auth, '/logout', 'POST', { refreshToken: accounts.author.refreshToken })).status).toBe(200);
  const next = await call(app.auth, '/login', 'POST', { username: 'author_demo', password });
  expect(next.status).toBe(200);
  const refreshedUsers = JSON.parse(readFileSync(path.join(app.storage, 'users', 'users'), 'utf8'));
  expect(refreshedUsers.find(user => user.id === accounts.author.user.id).revoked_at).toBeNull();
});
test('only admin can delete, including when the author owns the post', async () => {
  expect((await call(app.blog, '/api/posts/' + storyId, 'DELETE', undefined, accounts.author.accessToken)).status).toBe(403);
  expect((await call(app.blog, '/api/posts/' + storyId, 'DELETE', undefined, accounts.admin.accessToken)).status).toBe(200);
  expect((await call(app.blog, '/api/posts/' + storyId)).status).toBe(404);
  expect((await call(app.blog, '/api/posts/' + storyId, 'DELETE', undefined, accounts.admin.accessToken)).status).toBe(404);
  expect((await call(app.blog, '/api/posts/' + storyId, 'PUT', { title: 'Gone' }, accounts.admin.accessToken)).status).toBe(404);
});
test('all HTTP errors use the same JSON shape, including malformed JSON and unknown endpoints', async () => {
  const missing = await call(app.blog, '/does-not-exist');
  expect(missing.status).toBe(404);
  expect(Object.keys(missing.data)).toEqual(['error']);
  const malformed = await fetch(app.auth + '/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  expect(malformed.status).toBe(400);
  expect(Object.keys(await malformed.json())).toEqual(['error']);
  const tooBig = await fetch(app.blog + '/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'x'.repeat(70000) }) });
  expect(tooBig.status).toBe(413);
  expect(Object.keys(await tooBig.json())).toEqual(['error']);
});
test('frontend is served by Blog, with security headers and no .env access', async () => {
  const response = await fetch(app.blog + '/');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-security-policy')).toContain("script-src 'self'");
  expect(await response.text()).toContain('Sugilanon');
  expect((await fetch(app.blog + '/.env')).status).toBe(404);
});
