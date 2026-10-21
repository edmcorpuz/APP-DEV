import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function fixture(authPort, blogPort) {
  const storage = mkdtempSync(path.join(tmpdir(), 'sugilanon-test-'));
  const secret = randomBytes(48).toString('hex');
  const auth = 'http://localhost:' + authPort;
  const blog = 'http://localhost:' + blogPort;
  const children = new Map();
  let log = '';
  const env = { ...process.env, JWT_SECRET: secret, AUTH_PORT: String(authPort), BLOG_PORT: String(blogPort),
    FRONTEND_ORIGIN: blog, STORAGE_DIR: storage };
  async function start(name) {
    const child = spawn(process.execPath, [name + '/server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    children.set(name, child);
    child.stdout.on('data', chunk => { log += chunk; });
    child.stderr.on('data', chunk => { log += chunk; });
    const base = name === 'auth-server' ? auth : blog;
    for (let i = 0; i < 80; i++) {
      if (child.exitCode !== null) throw new Error('Server exited: ' + log);
      try { if ((await fetch(base + '/health')).ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Server did not start: ' + log);
  }
  async function stop(name) {
    const child = children.get(name);
    if (!child || child.exitCode !== null) return;
    await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
    children.delete(name);
  }
  async function cleanup() {
    await Promise.all([...children.keys()].map(stop));
    rmSync(storage, { recursive: true, force: true });
  }
  try { await start('auth-server'); await start('blog-api'); }
  catch (error) { await cleanup(); throw error; }
  return { auth, blog, secret, storage, start, stop, cleanup, getLog: () => log };
}
export async function call(base, endpoint, method = 'GET', body, token) {
  const response = await fetch(base + endpoint, {
    method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
