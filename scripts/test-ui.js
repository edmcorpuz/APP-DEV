import { connectBrowser } from '../tests/browser.js';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { fixture, call, root } from '../tests/helpers.js';

console.log('Starting isolated UI test servers…');
const app = await fixture(14001, 15001);
console.log('UI test servers ready.');
const artifacts = path.join(root, 'artifacts');
mkdirSync(artifacts, { recursive: true });
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
let browser;
let browserProcess;
let browserProfile;
const errors = [];
const checks = [];
const password = 'BrowserPass123!';
try {
  console.log('Launching browser:', executablePath || 'No Chrome/Edge found');
  // Use CDP instead of browser pipes: compatible with Bun on Windows.
  if (executablePath) {
    browserProfile = mkdtempSync(path.join(tmpdir(), 'sugilanon-browser-'));
    browserProcess = spawn(executablePath, ['--headless=new', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=19222', '--user-data-dir=' + browserProfile, 'about:blank'], { stdio: 'ignore' });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch('http://127.0.0.1:19222/json/version')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('Chrome debugging endpoint did not start.');
    browser = await connectBrowser('http://127.0.0.1:19222');
  } else {
    throw new Error('Browser tests require Chrome or Edge installed in a standard Windows location.');
  }
  console.log('Browser ready.');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  console.log('Browser page ready.');
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
  });
  async function ready(text) {
    await page.getByRole('heading', { name: text, exact: true }).waitFor();
  }
  async function visit(route) {
    console.log('UI route:', route);
    await page.goto(app.blog + '/#' + route);
  }
  async function register(username, role) {
    await visit('/register');
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('How would you like to join?').selectOption(role);
    await page.getByRole('button', { name: 'Create my account' }).click();
    await ready('Sign in to Sugilanon');
  }
  async function login(username) {
    await visit('/login');
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: false }).click();
    await page.getByRole('heading', { name: 'The latest stories' }).waitFor();
  }
  async function logout() {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.getByRole('navigation').getByRole('link', { name: 'Sign in', exact: true }).waitFor();
  }
  await visit('/');
  await ready('A fresh page, waiting for a voice.');
  checks.push('Public homepage and empty state');

  await register('writer_one', 'author');
  await login('writer_one');
  await page.getByRole('link', { name: 'Write a story', exact: false }).click();
  await page.getByLabel('Give your story a title').fill('The courage to begin');
  await page.getByLabel('Your story', { exact: true }).fill('Sometimes the hardest part is the first sentence.\n\nSugdan lang nato. We learn by trying, one small step at a time.');
  await page.getByRole('button', { name: 'Publish story' }).click();
  await ready('The courage to begin');
  const postId = page.url().split('/').at(-1);
  checks.push('Author registration, login, publish, and detail view');

  await page.getByRole('link', { name: 'Edit story', exact: true }).click();
  await page.getByLabel('Give your story a title').fill('The courage to start again');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await ready('The courage to start again');
  await page.getByRole('link', { name: 'My stories', exact: true }).click();
  await page.getByRole('heading', { name: 'My stories' }).waitFor();
  assert.equal(await page.locator('.post-card').count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Delete story', exact: true }).count(), 0);
  checks.push('Owner editing, own-post filtering, no author delete button');

  await visit('/account');
  await page.getByRole('button', { name: 'Renew my session', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Session renewed' }).waitFor();
  checks.push('Manual refresh from account screen');
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('sugilanon.session')));
  const claims = jwt.decode(session.accessToken);
  session.accessToken = jwt.sign({ id: claims.id, username: claims.username, role: claims.role }, app.secret, { expiresIn: -1 });
  await page.evaluate(value => localStorage.setItem('sugilanon.session', JSON.stringify(value)), session);
  await visit('/mine');
  await page.getByRole('heading', { name: 'My stories' }).waitFor();
  const renewed = await page.evaluate(() => JSON.parse(localStorage.getItem('sugilanon.session')));
  assert.ok(jwt.decode(renewed.accessToken).exp > Math.floor(Date.now() / 1000));
  checks.push('Automatic access-token refresh and retry');
  await logout();
  assert.equal((await call(app.auth, '/refresh', 'POST', { refreshToken: renewed.refreshToken })).status, 401);
  checks.push('UI logout revokes the saved refresh token');

  await register('reader_one', 'reader');
  await login('reader_one');
  await visit('/write');
  await ready('Enjoy the stories, one page at a time.');
  await visit('/mine');
  await ready('Your story starts here.');
  await visit('/posts/' + postId);
  await ready('The courage to start again');
  assert.equal(await page.getByRole('link', { name: 'Edit story', exact: true }).count(), 0);
  checks.push('Reader can browse and view own empty shelf, but cannot write or edit');
  await logout();

  await register('writer_two', 'author');
  await login('writer_two');
  await visit('/edit/' + postId);
  await ready('This story belongs to another writer.');
  checks.push('Second author cannot edit someone else’s story');
  await logout();

  await register('admin_one', 'admin');
  await login('admin_one');
  await visit('/posts/' + postId);
  await page.getByRole('link', { name: 'Edit story', exact: true }).click();
  await page.getByLabel('Your story', { exact: true }).fill('An admin can refine a story without becoming its author.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await ready('The courage to start again');
  await page.getByRole('button', { name: 'Delete story', exact: true }).click();
  await page.getByRole('button', { name: 'Keep the story' }).click();
  assert.equal((await call(app.blog, '/api/posts/' + postId)).status, 200);
  checks.push('Admin edits another author’s post; delete confirmation can be cancelled');
  await page.getByRole('button', { name: 'Delete story', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, delete story', exact: true }).click();
  await page.getByRole('heading', { name: 'The latest stories' }).waitFor();
  assert.equal((await call(app.blog, '/api/posts/' + postId)).status, 404);
  checks.push('Admin delete is integrated with the API');

  await visit('/write');
  await page.getByLabel('Give your story a title').fill('A note for the next chapter');
  await page.getByLabel('Your story', { exact: true }).fill('Learning to build something together is its own kind of story. This is a space to ask questions, share discoveries, and begin again.');
  await page.getByRole('button', { name: 'Publish story' }).click();
  await ready('A note for the next chapter');
  checks.push('Admin can also publish through the UI');
  const adminSession = await page.evaluate(() => JSON.parse(localStorage.getItem('sugilanon.session')));
  const markup = '<img src=x onerror="window.injected=true">';
  const literal = await call(app.blog, '/api/posts', 'POST', { title: 'Literal markup, not a script', content: markup }, adminSession.accessToken);
  await visit('/posts/' + literal.data.id);
  await ready('Literal markup, not a script');
  assert.equal(await page.evaluate(() => document.querySelector('.article-content').textContent), markup);
  assert.equal(await page.evaluate(() => !!window.injected), false);
  assert.equal(await page.locator('.article-content img').count(), 0);
  await call(app.blog, '/api/posts/' + literal.data.id, 'DELETE', undefined, adminSession.accessToken);
  checks.push('User markup stays literal text; no injected image or script runs');
  for (const [title, content] of [
    ['Finding quiet in a busy week', 'Between deadlines and everyday life, a short walk can be the pause we need. Sometimes a few minutes away help us return with a clearer mind.'],
    ['Small wins are still wins', 'Today I fixed one bug and finally understood why it happened. It was a small thing, but progress is often made of small things. Padayon lang.'],
    ['A little curiosity goes a long way', 'The best questions often begin with “what if?” Keep asking, keep exploring, and don’t be afraid to be the beginner in the room.'],
  ]) await call(app.blog, '/api/posts', 'POST', { title, content }, adminSession.accessToken);
  await visit('/');
  await page.getByRole('heading', { name: 'The latest stories' }).waitFor();
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('Small wins');
  assert.equal(await page.locator('.post-card').count(), 1);
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('nothing_matches_123');
  await ready('No stories found.');
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('');
  checks.push('Search and no-results states');
  await page.screenshot({ path: path.join(artifacts, 'desktop-home.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifacts, 'mobile-home.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  checks.push('390px mobile layout has no horizontal overflow');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit('/about');
  await page.getByText('Auth Server · online', { exact: false }).waitFor();
  await page.getByText('Blog API · online', { exact: false }).waitFor();
  checks.push('About page checks both servers');
  await page.screenshot({ path: path.join(artifacts, 'architecture.png'), fullPage: true });

  await app.stop('auth-server');
  await visit('/account');
  await page.getByRole('button', { name: 'Renew my session', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'could not reach the server' }).waitFor();
  await visit('/mine');
  await page.getByRole('heading', { name: 'My stories' }).waitFor();
  checks.push('Friendly Auth-offline error; Blog still works with existing token');
  await app.start('auth-server');
  await logout();

  await visit('/login');
  await page.getByLabel('Username', { exact: true }).fill('reader_one');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123');
  await page.getByRole('button', { name: 'Sign in', exact: false }).click();
  await page.getByRole('alert').filter({ hasText: 'do not match' }).waitFor();
  checks.push('Wrong-password feedback');
  await visit('/posts/missing-story');
  await ready('We couldn’t open this page.');
  checks.push('Missing-story error and recovery link');
  await visit('/');
  await page.getByRole('heading', { name: 'The latest stories' }).waitFor();
  checks.push('Signed-out public browsing still works');
  assert.deepEqual(errors, []);
  const report = { passed: checks.length, failed: 0, checks, browserErrors: errors, timestamp: new Date().toISOString() };
  writeFileSync(path.join(artifacts, 'ui-test-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  writeFileSync(path.join(artifacts, 'ui-test-failure.txt'), String(error.stack));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (browserProcess && browserProcess.exitCode === null) {
    await new Promise(resolve => { browserProcess.once('exit', resolve); browserProcess.kill(); });
  }
  if (browserProfile) {
    try { rmSync(browserProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
  }
  await app.cleanup();
}
