import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createApp } from '../app.js';

const account = { email: 'student@example.com', username: 'student', password: 'demo-password' };
let server;
let base;
let store;

beforeEach(async () => {
  store = [];
  const app = createApp({ userStore: store, jwtSecret: 'test-only-jwt-secret' });
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

async function post(endpoint, body, cookie) {
  return fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
const tokenCookie = (response) => response.headers.get('set-cookie').split(';')[0];

async function expectError(response, status, text) {
  expect(response.status).toBe(status);
  const result = await response.json();
  expect(result.status).toBe(status);
  expect(result.message).toContain(text);
  expect(result.user).toBeUndefined();
}

describe('signup', () => {
  test('returns 201, stores a unique ID and hashed password, issues a JWT', async () => {
    const response = await post('signup', account);
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.status).toBe(201);
    expect(result.user).toEqual({ id: store[0].id, email: account.email, username: account.username, bio: '' });
    expect(result.user.passwordHash).toBeUndefined();
    expect(store).toHaveLength(1);
    expect(store[0].id).toMatch(/^[a-f0-9-]{36}$/);
    expect(store[0].passwordHash).not.toBe(account.password);
    expect(store[0].password).toBeUndefined();
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Lax');
    const home = await fetch(`${base}/home.html`, { headers: { Cookie: tokenCookie(response) } });
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('Welcome home.');
  });

  for (const field of ['email', 'username', 'password']) {
    for (const value of ['', '   ', null, 42]) {
      test(`returns 400 for ${field} = ${JSON.stringify(value)}`, async () => {
        await expectError(await post('signup', { ...account, [field]: value }), 400, 'required');
        expect(store).toHaveLength(0);
      });
    }
    test(`returns 400 when ${field} is omitted`, async () => {
      const body = { ...account };
      delete body[field];
      await expectError(await post('signup', body), 400, 'required');
    });
  }

  test('returns 400 for no request body', async () => {
    await expectError(await post('signup'), 400, 'required');
  });

  test('returns 400 for invalid email', async () => {
    await expectError(await post('signup', { ...account, email: 'not-an-email' }), 400, 'valid email');
  });

  test('returns 409 for existing email or username, ignoring case', async () => {
    await post('signup', account);
    await expectError(await post('signup', { ...account, username: 'different', email: 'STUDENT@example.com' }), 409, 'already exists');
    await expectError(await post('signup', { ...account, email: 'other@example.com', username: 'STUDENT' }), 409, 'already exists');
    expect(store).toHaveLength(1);
  });

  test('does not allow one account username to match another account email', async () => {
    await post('signup', account);
    await expectError(await post('signup', { ...account, username: 'STUDENT@example.com', email: 'other@example.com' }), 409, 'already exists');
    await post('signup', { ...account, username: 'third@example.com', email: 'second@example.com' });
    await expectError(await post('signup', { ...account, username: 'third', email: 'THIRD@example.com' }), 409, 'already exists');
  });

  test('simultaneous duplicate requests create only one user', async () => {
    const responses = await Promise.all([post('signup', account), post('signup', account)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(store).toHaveLength(1);
  });

  test('different accounts receive different IDs', async () => {
    await post('signup', account);
    await post('signup', { ...account, email: 'other@example.com', username: 'other' });
    expect(store).toHaveLength(2);
    expect(store[0].id).not.toBe(store[1].id);
  });
});

describe('login', () => {
  test('returns 200 for credentials in the body and issues a new JWT', async () => {
    const signup = await post('signup', account);
    const response = await post('login', { username: ' STUDENT ', password: account.password });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe(200);
    expect(result.user.username).toBe(account.username);
    expect(tokenCookie(response)).not.toBe(tokenCookie(signup));
    const home = await fetch(`${base}/home.html`, { headers: { Cookie: tokenCookie(response) } });
    expect(home.status).toBe(200);
  });

  for (const field of ['username', 'password']) {
    for (const value of ['', '   ', null, 42]) {
      test(`returns 400 for ${field} = ${JSON.stringify(value)}`, async () => {
        await expectError(await post('login', { username: account.username, password: account.password, [field]: value }), 400, 'required');
      });
    }
    test(`returns 400 when ${field} is omitted`, async () => {
      const body = { username: account.username, password: account.password };
      delete body[field];
      await expectError(await post('login', body), 400, 'required');
    });
  }

  test('query-string credentials do not count as a body', async () => {
    await expectError(await post('login?username=student&password=demo-password'), 400, 'required');
  });

  test('returns 401 for an unknown user or wrong password', async () => {
    await expectError(await post('login', { username: 'missing', password: 'demo-password' }), 401, 'Invalid username, email, or password');
    await post('signup', account);
    await expectError(await post('login', { username: account.username, password: 'wrong' }), 401, 'Invalid username, email, or password');
    await expectError(await post('login', { username: account.email, password: 'wrong' }), 401, 'Invalid username, email, or password');
  });

  test('accepts email at login, ignoring case and surrounding whitespace', async () => {
    await post('signup', account);
    const response = await post('login', { username: ' STUDENT@EXAMPLE.COM ', password: account.password });
    expect(response.status).toBe(200);
    expect((await response.json()).user.username).toBe(account.username);
  });

  test('password whitespace is preserved, not silently trimmed', async () => {
    await post('signup', { ...account, password: ' secret ' });
    expect((await post('login', { username: account.username, password: ' secret ' })).status).toBe(200);
    expect((await post('login', { username: account.username, password: 'secret' })).status).toBe(401);
  });
});

describe('HTTP and pages', () => {
  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    test(`login rejects ${method} with 405 and Allow: POST`, async () => {
      const response = await fetch(`${base}/api/login`, { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
    });
  }

  test('invalid JSON returns 400', async () => {
    const response = await fetch(`${base}/api/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    await expectError(response, 400, 'valid JSON');
  });

  test('oversized bodies return 413', async () => {
    await expectError(await post('signup', { ...account, extra: 'x'.repeat(9000) }), 413, 'too large');
  });

  test('unknown API endpoints return 404', async () => {
    await expectError(await post('missing', {}), 404, 'not found');
  });

  test('signup, login, styles, and scripts are served', async () => {
    for (const file of ['signup.html', 'login.html', 'styles.css', 'auth.js', 'home.js', 'profile.js', 'users.js']) {
      expect((await fetch(`${base}/${file}`)).status).toBe(200);
    }
  });

  test('anonymous homepage requests redirect to login', async () => {
    const response = await fetch(`${base}/home.html`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/login.html');
  });

  test('logout clears the browser cookie and logged-out requests are redirected', async () => {
    const signup = await post('signup', account);
    const response = await post('logout', undefined, tokenCookie(signup));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Expires=Thu, 01 Jan 1970');
    const home = await fetch(`${base}/home.html`, { redirect: 'manual' });
    expect(home.status).toBe(302);
  });

  test('demo users and implementation files are not publicly served', async () => {
    for (const file of ['database/users.js', 'database/users.json', 'database/users.json.tmp', 'app.js', '.env', 'lib/auth.js', 'pages/home.html', 'pages/about.html', 'pages/users.html']) {
      expect((await fetch(`${base}/${file}`)).status).toBe(404);
    }
  });

  test('production configuration requires an explicit secret', () => {
    expect(() => createApp({ production: true })).toThrow('JWT_SECRET');
  });
});
