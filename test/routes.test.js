import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { cookieName } from '../lib/auth.js';

const secret = 'test-only-jwt-secret-at-least-32-characters';
const account = { username: 'student', email: 'student@example.com', password: 'demo-password', bio: 'Learning web development.' };
let server;
let base;
let store;
let cookie;

async function signup(body) {
  return fetch(`${base}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  store = [];
  const app = createApp({ userStore: store, jwtSecret: secret });
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await signup(account);
  cookie = response.headers.get('set-cookie').split(';')[0];
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

function get(route, tokenCookie = cookie) {
  return fetch(`${base}${route}`, { headers: { Cookie: tokenCookie }, redirect: 'manual' });
}

function signedCookie(options = {}, signingSecret = secret) {
  const token = jwt.sign({}, signingSecret, { subject: store[0].id, expiresIn: '1h', ...options });
  return `${cookieName}=${token}`;
}

describe('JWT secured routes', () => {
  test('issued JWT has a verified signature and a one-hour expiry', () => {
    const token = cookie.slice(cookie.indexOf('=') + 1);
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    expect(payload.sub).toBe(store[0].id);
    expect(payload.exp - payload.iat).toBe(3600);
    expect(payload.email).toBeUndefined();
    expect(payload.passwordHash).toBeUndefined();
  });

  for (const route of ['/home.html', '/about', '/about.html', '/users', '/users.html']) {
    test(`${route} is protected by middleware`, async () => {
      const anonymous = await get(route, '');
      expect(anonymous.status).toBe(302);
      expect(anonymous.headers.get('location')).toBe('/login.html');
      const authenticated = await get(route);
      expect(authenticated.status).toBe(200);
      expect(authenticated.headers.get('cache-control')).toContain('no-store');
    });
  }

  test('About Me returns the current user, not the latest registered account', async () => {
    await signup({ ...account, username: 'other', email: 'other@example.com', bio: 'Another student.' });
    const response = await get('/api/me');
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.user).toEqual({ id: store[0].id, username: account.username, email: account.email, bio: account.bio });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  test('Users returns all registered profiles, never passwords or hashes', async () => {
    await signup({ ...account, username: 'other', email: 'other@example.com' });
    const response = await get('/api/users');
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.users.map((user) => user.username)).toEqual(['student', 'other']);
    for (const user of result.users) {
      expect(Object.keys(user).sort()).toEqual(['bio', 'email', 'id', 'username']);
    }
  });

  for (const kind of ['missing', 'malformed', 'expired', 'wrong signature', 'unknown user', 'no expiry', 'wrong algorithm']) {
    test(`rejects ${kind} tokens on every protected page and API`, async () => {
      let invalidCookie = '';
      if (kind === 'malformed') invalidCookie = `${cookieName}=not-a-jwt`;
      if (kind === 'expired') invalidCookie = signedCookie({ expiresIn: -1 });
      if (kind === 'wrong signature') invalidCookie = signedCookie({}, 'another-secret');
      if (kind === 'unknown user') invalidCookie = signedCookie({ subject: 'missing-id' });
      if (kind === 'no expiry') invalidCookie = `${cookieName}=${jwt.sign({ sub: store[0].id }, secret)}`;
      if (kind === 'wrong algorithm') invalidCookie = signedCookie({ algorithm: 'HS384' });
      for (const route of ['/api/me', '/api/users']) {
        const response = await get(route, invalidCookie);
        expect(response.status).toBe(401);
        const result = await response.json();
        expect(result.user).toBeUndefined();
        expect(result.users).toBeUndefined();
      }
      for (const route of ['/home.html', '/about', '/users']) {
        const response = await get(route, invalidCookie);
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/login.html');
      }
    });
  }

  test('rejects a token after its user is removed', async () => {
    store.length = 0;
    expect((await get('/api/me')).status).toBe(401);
  });

  test('bio is optional, trimmed, limited to 500 characters, and must be text', async () => {
    for (const bio of [42, {}, 'x'.repeat(501)]) {
      expect((await signup({ ...account, username: 'other', email: 'other@example.com', bio })).status).toBe(400);
    }
    const response = await signup({ ...account, username: 'other', email: 'other@example.com', bio: '  Hello!  ' });
    expect(response.status).toBe(201);
    expect((await response.json()).user.bio).toBe('Hello!');
  });

  test('production rejects short signing secrets', () => {
    expect(() => createApp({ production: true, jwtSecret: 'short' })).toThrow('JWT_SECRET');
  });
});
