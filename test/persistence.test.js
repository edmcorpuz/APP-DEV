import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';
import { openUserStore } from '../database/users.js';

const account = { username: 'student', email: 'student@example.com', password: 'demo-password', bio: 'Learning JWT.' };
let directory;
let file;
let server;
let base;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'app-dev-users-'));
  file = path.join(directory, 'users.json');
});

afterEach(async () => {
  await stop();
  rmSync(directory, { recursive: true, force: true });
});

async function start() {
  const { users, addUser } = openUserStore(file);
  const app = createApp({ userStore: users, addUser });
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}`;
}

async function stop() {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  server = undefined;
}

function post(route, body) {
  return fetch(`${base}/api/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('signup survives server restart; username and email login can access protected routes', async () => {
  await start();
  const signup = await post('signup', account);
  expect(signup.status).toBe(201);
  const original = (await signup.json()).user;
  await stop();
  await start(); // A fresh app, signing secret, and user array loaded from disk.

  for (const identifier of [account.username, ' STUDENT@EXAMPLE.COM ']) {
    const login = await post('login', { username: identifier, password: account.password });
    expect(login.status).toBe(200);
    expect((await login.json()).user).toEqual(original);
    const headers = { Cookie: login.headers.get('set-cookie').split(';')[0] };
    const profile = await fetch(`${base}/api/me`, { headers });
    expect(profile.status).toBe(200);
    expect((await profile.json()).user).toEqual(original);
    const users = await fetch(`${base}/api/users`, { headers });
    expect((await users.json()).users).toEqual([original]);
    expect((await fetch(`${base}/about`, { headers, redirect: 'manual' })).status).toBe(200);
  }
  expect((await post('signup', account)).status).toBe(409);
  expect((await post('login', { username: account.email, password: 'wrong' })).status).toBe(401);
});

test('saved accounts contain only hashed passwords and preserve every user', async () => {
  await start();
  expect((await post('signup', account)).status).toBe(201);
  expect((await post('signup', { ...account, username: 'other', email: 'other@example.com' })).status).toBe(201);
  const contents = readFileSync(file, 'utf8');
  expect(contents).not.toContain(account.password);
  const saved = JSON.parse(contents);
  expect(saved).toHaveLength(2);
  for (const user of saved) {
    expect(user.password).toBeUndefined();
    expect(user.passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  }
});

test('failed disk writes do not add an account to memory', () => {
  const store = openUserStore(path.join(directory, 'missing-folder', 'users.json'));
  expect(() => store.addUser({ id: 'test' })).toThrow();
  expect(store.users).toHaveLength(0);
});

test('invalid saved data is not silently erased', () => {
  for (const contents of ['{broken', '{}', '[null]', '[{"username":"incomplete"}]']) {
    writeFileSync(file, contents);
    expect(() => openUserStore(file)).toThrow();
    expect(readFileSync(file, 'utf8')).toBe(contents);
  }
});
