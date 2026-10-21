// Small vanilla-JS frontend: each page calls the real API, never mock records.
const main = document.querySelector('#main');
const navigation = document.querySelector('#navigation');
const notice = document.querySelector('#notice');
const SESSION_KEY = 'sugilanon.session';
let session = null;
let authUrl;
let renderId = 0;
let refreshInFlight = null;
try {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
  if (typeof saved?.accessToken === 'string' && typeof saved?.refreshToken === 'string') session = saved;
} catch { localStorage.removeItem(SESSION_KEY); }

// Escaping user text is essential: stories are text, not executable HTML.
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const readingTime = content => Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
function currentUser() {
  if (!session) return null;
  try {
    const part = session.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part));
  } catch { return null; }
}
// Decoding is for UI labels only. The server still verifies the JWT signature.
function saveSession(value) {
  session = value;
  if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else localStorage.removeItem(SESSION_KEY);
}
function flash(message, bad = false) {
  notice.textContent = message;
  notice.classList.toggle('bad', bad);
  notice.hidden = false;
}
function go(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}
async function request(base, path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('We could not reach the server. Check that both servers are running, then try again.');
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
async function renewSession() {
  if (!session) throw new Error('Please sign in first.');
  if (!refreshInFlight) {
    const oldSession = session;
    refreshInFlight = request(authUrl, '/refresh', { method: 'POST', body: { refreshToken: oldSession.refreshToken } })
      .then(data => { if (session === oldSession) saveSession({ ...oldSession, accessToken: data.accessToken }); })
      .catch(error => {
        if (error.status === 401 && session === oldSession) {
          saveSession(null); updateNavigation(); flash('Your session has ended. Please sign in again.', true);
        }
        throw error;
      }).finally(() => { refreshInFlight = null; });
  }
  await refreshInFlight;
}
async function blog(path, options = {}, protectedRoute = false) {
  if (protectedRoute && !session) throw new Error('Please sign in to continue.');
  try {
    return await request('', path, { ...options, token: protectedRoute ? session?.accessToken : undefined });
  } catch (error) {
    // Expired access token? Ask Auth once, then retry. Dili balik-balik forever.
    if (protectedRoute && error.status === 401 && session) {
      await renewSession();
      if (!session) throw new Error('Please sign in again.');
      return request('', path, { ...options, token: session.accessToken });
    }
    throw error;
  }
}
function updateNavigation() {
  const user = currentUser();
  const route = location.hash || '#/';
  navigation.innerHTML = '<a href="#/" class="' + (route === '#/' ? 'active' : '') + '">All stories</a>' +
    (user ? '<a href="#/mine" class="' + (route === '#/mine' ? 'active' : '') + '">My stories</a>' : '') +
    '<a href="#/about">About</a>' +
    (user ? '<span class="nav-user"><a href="#/account" title="Your account">' + escapeHTML(user.username) + '</a><span class="pill">' + escapeHTML(user.role) + '</span></span><button id="logout" class="text-button">Sign out</button>'
      : '<a href="#/login">Sign in</a><a class="button small-button" href="#/register">Join the community ↗</a>');
  document.querySelector('#logout')?.addEventListener('click', async event => {
    event.target.disabled = true;
    try {
      await request(authUrl, '/logout', { method: 'POST', body: { refreshToken: session.refreshToken } });
      saveSession(null); flash('You’re signed out. The stories are still here for you.'); go('/');
    } catch (error) {
      flash(error.message + ' You have not been signed out yet.', true); event.target.disabled = false;
    }
  });
}
function card(post) {
  return '<article class="post-card"><div class="meta"><span class="pill">Community story</span><span>' + readingTime(post.content) + ' min read</span></div>' +
    '<h3><a href="#/posts/' + encodeURIComponent(post.id) + '">' + escapeHTML(post.title) + '</a></h3><p>' + escapeHTML(post.content.slice(0, 125)) + (post.content.length > 125 ? '…' : '') + '</p>' +
    '<div class="card-bottom"><span><span class="avatar">' + escapeHTML(post.authorName.slice(0, 1).toUpperCase()) + '</span>' + escapeHTML(post.authorName) + '<br><span class="small">' + date(post.created_at) + '</span></span>' +
    '<a class="read-link" href="#/posts/' + encodeURIComponent(post.id) + '">Read story ↗</a></div></article>';
}
function empty(title, description, link = '') {
  return '<div class="empty"><span class="eyebrow">A LITTLE ROOM TO GROW</span><h3>' + title + '</h3><p>' + description + '</p>' + link + '</div>';
}
async function stories(mine, id) {
  const user = currentUser();
  if (mine && !user) return loginRequired();
  const posts = await blog(mine ? '/api/me/posts' : '/api/posts', {}, mine);
  if (id !== renderId) return;
  const canWrite = ['author', 'admin'].includes(user?.role);
  main.innerHTML = (mine
    ? '<section><span class="eyebrow">YOUR PERSONAL SHELF</span><h1>Words you’ve shared.</h1><p class="small">Your stories, all in one place. Keep writing, keep growing.</p></section>'
    : '<section class="hero"><div><span class="eyebrow">THE COMMUNITY JOURNAL</span><h1>Small stories.<br><em>Shared perspectives.</em></h1><p>A quiet corner of the internet for curious minds. Read something new, share what matters, and make yourself at home.</p><div class="hero-foot"><a class="button" href="' + (canWrite ? '#/write' : user ? '#/about' : '#/register') + '">' + (canWrite ? 'Write a story ↗' : user ? 'Meet the community ↗' : 'Find your voice ↗') + '</a><span class="mini-line"></span><span class="small">Everyone’s welcome.</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-circle"></div><div class="art-card"><span class="quote">“</span><p>There’s a story<br>in all of us.</p><small>UNSA IMONG SUGILANON?</small></div></div></section>') +
    '<section aria-labelledby="stories-title"><div class="section-header"><div><span class="eyebrow">' + (mine ? 'MADE BY YOU' : 'FROM THE COMMUNITY') + '</span><h2 id="stories-title">' + (mine ? 'My stories' : 'The latest stories') + ' <span id="count" class="pill">' + posts.length + '</span></h2></div><label class="search"><span class="small">Search</span><input id="search" type="search" placeholder="Find a story or a writer…" aria-label="Search stories"></label></div>' +
    '<div class="section-layout"><div id="post-grid" class="post-grid"></div><aside class="sidebar"><div class="aside-card tint"><span class="eyebrow">SUGILANON / noun</span><h3>A story.<br>A conversation.<br>A connection.</h3><p>In Bisaya, “sugilanon” means a story. This is a little space for yours.</p>' +
    (canWrite ? '<a href="#/write" class="button">Share a story ↗</a>' : !user ? '<a href="#/register" class="button">Make yourself at home ↗</a>' : '<a href="#/account" class="button">Your account ↗</a>') +
    '</div><div class="aside-card"><span class="eyebrow">THERE’S A PLACE FOR YOU</span><ul class="role-list"><li><strong>Readers</strong><span>Discover a fresh perspective.</span></li><li><strong>Authors</strong><span>Write and shape your own stories.</span></li><li><strong>Admins</strong><span>Help keep this space thoughtful.</span></li></ul><a class="small" href="#/about">How it all works ↗</a></div></aside></div></section>';
  const grid = document.querySelector('#post-grid');
  const draw = query => {
    const filtered = posts.filter(post => (post.title + ' ' + post.content + ' ' + post.authorName).toLowerCase().includes(query.toLowerCase()));
    document.querySelector('#count').textContent = filtered.length;
    grid.innerHTML = filtered.map(card).join('') || empty(query ? 'No stories found.' : mine ? 'Your story starts here.' : 'A fresh page, waiting for a voice.',
      query ? 'Try a different title, word, or writer.' : user?.role === 'reader' && mine ? 'Reader accounts explore stories. Writing is available to authors and admins.' : 'There are no stories here yet. The first one could be yours.',
      !query && canWrite ? '<a class="button" href="#/write">Write your first story ↗</a>' : '');
  };
  draw('');
  document.querySelector('#search').addEventListener('input', event => draw(event.target.value));
}
function loginRequired() {
  main.innerHTML = empty('Come on in.', 'Sign in to see your personal space.', '<a class="button" href="#/login">Sign in</a>');
}
function authPage(registering) {
  main.innerHTML = '<div class="form-layout"><section class="form-intro"><span class="eyebrow">' + (registering ? 'PULL UP A CHAIR' : 'YOUR NEXT CHAPTER') + '</span><h1>' +
    (registering ? 'Good stories<br>start with you.' : 'Welcome back.<br>Stay a while.') + '</h1><p>' + (registering ? 'Read, write, and connect. There’s room for your perspective here.' : 'Your ideas, your stories, your little corner of the community.') +
    '</p><p class="small">“Sugilanon” is Bisaya for story.<br>Unsa imong sugilanon? What’s your story?</p><a class="back-link" href="#/">← Just here to read? Browse stories</a></section><section class="form-card"><h2>' +
    (registering ? 'Join the community' : 'Sign in to Sugilanon') + '</h2><p>' + (registering ? 'A few details, and you’re part of the conversation.' : 'Let’s pick up where you left off.') + '</p>' +
    '<form id="auth-form"><label for="username">Username</label><input id="username" name="username" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="e.g. story_seeker">' +
    '<label for="password">Password</label><input id="password" name="password" type="password" required minlength="8" maxlength="128" autocomplete="' + (registering ? 'new-password' : 'current-password') + '" placeholder="At least 8 characters">' +
    (registering ? '<label for="role">How would you like to join?</label><select id="role" name="role"><option value="reader">Reader — here to explore</option><option value="author">Author — ready to write</option><option value="admin">Admin — help manage stories</option></select><span class="helper">Classroom demo: role selection is open, as required by the exam. A real app would restrict admin registration.</span>' : '') +
    '<p id="form-error" class="error" role="alert"></p><button type="submit" class="button">' + (registering ? 'Create my account ↗' : 'Sign in ↗') + '</button></form><p>' +
    (registering ? 'Already part of the community? <a href="#/login"><strong>Sign in</strong></a>' : 'New around here? <a href="#/register"><strong>Create an account</strong></a>') + '</p></section></div>';
  document.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.target.querySelector('button');
    const errorBox = document.querySelector('#form-error');
    button.disabled = true; errorBox.textContent = '';
    try {
      const body = Object.fromEntries(new FormData(event.target));
      const data = await request(authUrl, registering ? '/register' : '/login', { method: 'POST', body });
      if (registering) { flash('Your account is ready! Sign in to make yourself at home.'); go('/login'); }
      else { saveSession(data); flash('Welcome back, ' + currentUser().username + '.'); go('/'); }
    } catch (error) { errorBox.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
async function story(postId, editing, id) {
  const post = await blog('/api/posts/' + encodeURIComponent(postId));
  if (id !== renderId) return;
  const user = currentUser();
  if (editing) {
    if (!user) return loginRequired();
    if (post.authorId !== user.id && user.role !== 'admin') {
      main.innerHTML = empty('This story belongs to another writer.', 'Only the owner or an admin can edit it.'); return;
    }
    return editor(post);
  }
  main.innerHTML = '<article class="article"><a href="#/" class="back-link">← Back to all stories</a><br><span class="eyebrow">A COMMUNITY STORY</span><h1>' + escapeHTML(post.title) + '</h1>' +
    '<div class="meta"><span class="avatar">' + escapeHTML(post.authorName.slice(0, 1).toUpperCase()) + '</span><strong>' + escapeHTML(post.authorName) + '</strong><span>·</span><span>' + date(post.created_at) + '</span><span>·</span><span>' + readingTime(post.content) + ' min read</span></div>' +
    '<div class="article-content">' + escapeHTML(post.content) + '</div><div class="actions">' +
    (user && (user.id === post.authorId || user.role === 'admin') ? '<a class="button secondary" href="#/edit/' + encodeURIComponent(post.id) + '">Edit story</a>' : '') +
    (user?.role === 'admin' ? '<button id="delete-story" class="button danger">Delete story</button>' : '') + '<a href="#/" class="small">Keep exploring ↗</a></div></article>';
  document.querySelector('#delete-story')?.addEventListener('click', () => openDelete(post.id));
}
function editor(post = null) {
  const user = currentUser();
  if (!user) return loginRequired();
  if (!post && !['author', 'admin'].includes(user.role)) {
    main.innerHTML = empty('Enjoy the stories, one page at a time.', 'Reader accounts cannot publish. Sign in with an author or admin account to write.'); return;
  }
  main.innerHTML = '<section class="editor"><a class="back-link" href="' + (post ? '#/posts/' + encodeURIComponent(post.id) : '#/') + '">← Back to stories</a><br><span class="eyebrow">' +
    (post ? 'A LITTLE POLISH' : 'MAKE YOURSELF HEARD') + '</span><h1>' + (post ? 'Good stories keep growing.' : 'What’s on your mind?') + '</h1><p class="small">' +
    (post ? 'Refine your words. Your original author stays the same.' : 'It doesn’t have to be perfect. It just has to be yours.') + '</p><form id="editor-form"><label for="title">Give your story a title</label>' +
    '<input id="title" name="title" required maxlength="150" placeholder="A thought worth sharing…" value="' + escapeHTML(post?.title || '') + '"><label for="content">Your story</label>' +
    '<textarea id="content" name="content" required maxlength="20000" placeholder="Start with a moment, an idea, or a question…">' + escapeHTML(post?.content || '') + '</textarea>' +
    '<p id="word-count" class="small counter"></p><p id="editor-error" class="error" role="alert"></p><div class="actions"><button class="button" type="submit">' +
    (post ? 'Save changes ↗' : 'Publish story ↗') + '</button><a class="button secondary" href="' + (post ? '#/posts/' + encodeURIComponent(post.id) : '#/') + '">Cancel</a></div><p class="helper">Published stories are visible to everyone. Please don’t share private information.</p></form></section>';
  const content = document.querySelector('#content');
  const count = () => { document.querySelector('#word-count').textContent = (content.value.trim() ? content.value.trim().split(/\s+/).length : 0) + ' words · ' + content.value.length + ' / 20,000 characters'; };
  content.addEventListener('input', count); count();
  document.querySelector('#editor-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.target.querySelector('button');
    button.disabled = true;
    document.querySelector('#editor-error').textContent = '';
    try {
      const saved = await blog(post ? '/api/posts/' + encodeURIComponent(post.id) : '/api/posts', {
        method: post ? 'PUT' : 'POST', body: Object.fromEntries(new FormData(event.target)),
      }, true);
      flash(post ? 'Changes saved. Your story is ready to read.' : 'Your story is out in the world. Thanks for sharing!');
      go('/posts/' + encodeURIComponent(saved.id));
    } catch (error) { document.querySelector('#editor-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
function openDelete(postId) {
  const dialog = document.querySelector('#delete-dialog');
  const confirm = document.querySelector('#confirm-delete');
  const cancel = document.querySelector('#cancel-delete');
  document.querySelector('#delete-error').textContent = '';
  dialog.showModal();
  cancel.onclick = () => dialog.close();
  confirm.onclick = async () => {
    confirm.disabled = cancel.disabled = true;
    try {
      await blog('/api/posts/' + encodeURIComponent(postId), { method: 'DELETE' }, true);
      dialog.close(); flash('The story has been deleted.'); go('/');
    } catch (error) { document.querySelector('#delete-error').textContent = error.message; }
    finally { confirm.disabled = cancel.disabled = false; }
  };
}
function account() {
  const user = currentUser();
  if (!user) return loginRequired();
  main.innerHTML = '<section class="about"><span class="eyebrow">YOUR LITTLE CORNER</span><h1>Hello, ' + escapeHTML(user.username) + '.</h1><p>You’re here as an <strong>' + escapeHTML(user.role) + '</strong>. Your role controls what the API lets you do, not just which buttons you see.</p>' +
    '<div class="architecture">Access token: 15-minute lifetime<br>Refresh token: 7-day lifetime<br>Access expires: <span id="expires">' + new Date(user.exp * 1000).toLocaleString() + '</span></div>' +
    '<p>The app renews an expired access token automatically when a protected request needs it. You can also try it yourself below.</p><div class="actions"><button class="button" id="refresh-session">Renew my session</button><a href="#/mine" class="button secondary">See my stories</a></div><p class="helper">Signing out revokes your refresh token. An already-issued access token can still work until it expires. Tokens stored in browser localStorage are a classroom simplification, not a production security recommendation.</p></section>';
  document.querySelector('#refresh-session').onclick = async event => {
    event.target.disabled = true;
    try { await renewSession(); flash('Session renewed. You’re good to keep going.'); account(); }
    catch (error) { flash(error.message, true); if (!session) go('/login'); }
    finally { event.target.disabled = false; }
  };
}
async function about(id) {
  main.innerHTML = '<section class="about"><span class="eyebrow">BEHIND THE STORIES</span><h1>One community.<br>Two independent servers.</h1><p>Sugilanon is a small blogging community built for the App Dev midterm. Anyone can read. Authors can publish and edit their own work. Admins can create, edit, and delete any story.</p>' +
    '<div class="status-row"><span id="auth-status" class="status-chip">Checking Auth Server…</span><span id="blog-status" class="status-chip">Checking Blog API…</span></div><div class="architecture">Browser → Auth Server :4000 → signs JWTs<br>Browser → Blog API :5000 → verifies JWTs locally<br>Both servers → one shared .env secret<br>Separate localStorage → users / posts</div>' +
    '<h2>A few things worth knowing.</h2><details open><summary>Authentication vs. authorization</summary><p>Authentication asks “Who are you?” Authorization asks “What may you do?” Sa Bisaya: kinsa ka, ug unsa imong pwede buhaton? The API checks both, even if someone bypasses the UI.</p></details>' +
    '<details><summary>What happens when you sign out?</summary><p>The Auth Server clears the saved refresh token and records revoked_at. The browser clears its session. Because the Blog API never calls Auth, an existing access token remains valid for up to 15 minutes.</p></details>' +
    '<details><summary>Where do the stories live?</summary><p>Each server loads an in-memory array from file-backed localStorage at startup and saves it after changes. Browser localStorage holds the session, not the authoritative user or post records.</p></details>' +
    '<details><summary>Why can anyone choose admin here?</summary><p>The exam explicitly asks for role selection during registration. This is for classroom demonstration only. A real application must restrict admin creation.</p></details></section>';
  await Promise.all([['auth', authUrl], ['blog', '']].map(async ([name, base]) => {
    let ok = false;
    try { ok = (await request(base, '/health')).status === 'ok'; } catch {}
    if (id !== renderId) return;
    const el = document.querySelector('#' + name + '-status');
    if (el) el.textContent = (ok ? '● ' : '○ ') + (name === 'auth' ? 'Auth Server' : 'Blog API') + (ok ? ' · online' : ' · unavailable');
  }));
}
async function render() {
  const id = ++renderId;
  const route = (location.hash.slice(1) || '/').split('/');
  updateNavigation();
  main.innerHTML = '<p class="loading" role="status">Getting things ready…</p>';
  try {
    if (route[1] === '') await stories(false, id);
    else if (route[1] === 'mine') await stories(true, id);
    else if (route[1] === 'login') authPage(false);
    else if (route[1] === 'register') authPage(true);
    else if (route[1] === 'write') editor();
    else if (route[1] === 'posts' || route[1] === 'edit') await story(decodeURIComponent(route[2] || ''), route[1] === 'edit', id);
    else if (route[1] === 'account') account();
    else if (route[1] === 'about') await about(id);
    else main.innerHTML = empty('A little off the beaten path.', 'This page does not exist.', '<a class="button" href="#/">Back to stories</a>');
  } catch (error) {
    if (id !== renderId) return;
    main.innerHTML = empty('We couldn’t open this page.', escapeHTML(error.message), '<button id="retry" class="button">Try again</button> <a href="#/" class="button secondary">All stories</a>');
    document.querySelector('#retry').onclick = render;
  }
  if (id === renderId) {
    document.title = (route[1] ? route[1][0].toUpperCase() + route[1].slice(1) : 'Stories worth sharing') + ' | Sugilanon';
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
window.addEventListener('hashchange', render);
window.addEventListener('storage', event => {
  if (event.key === SESSION_KEY) {
    try { session = JSON.parse(event.newValue); } catch { session = null; }
    render();
  }
});
try {
  authUrl = (await request('', '/config')).authUrl;
  await render();
} catch (error) {
  main.textContent = error.message + ' Reload the page after starting the servers.';
}
