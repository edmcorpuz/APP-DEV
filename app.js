import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';

import { users } from './database/users.js';
import { hashPassword, verifyPassword } from './lib/passwords.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const cookieName = 'appdev.sid';

const publicUser = ({ id, email, username }) => ({ id, email, username });
const reply = (res, status, message, user) => res.status(status).json({
  status,
  message,
  ...(user ? { user: publicUser(user) } : {}),
});
const hasFields = (body, fields) => fields.every((field) =>
  typeof body?.[field] === 'string' && body[field].trim().length > 0,
);

async function startSession(req, userId) {
  // Regeneration prevents reuse of a pre-login session ID.
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = userId;
  await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
}

export function createApp({ userStore = users, sessionSecret, production = false } = {}) {
  if (production && !sessionSecret) throw new Error('SESSION_SECRET is required in production.');
  const app = express();
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1);

  // Only the API is POST-only. Browsers still use GET to load HTML/CSS/JS.
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      return reply(res, 405, 'This API only accepts POST requests.');
    }
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.use(session({
    name: cookieName,
    secret: sessionSecret || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 60 * 60 * 1000 },
  }));

  app.post('/api/signup', async (req, res) => {
    if (!hasFields(req.body, ['email', 'username', 'password'])) {
      return reply(res, 400, 'Email, username, and password are required.');
    }
    const email = req.body.email.trim().toLowerCase();
    const username = req.body.username.trim();
    const password = req.body.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(res, 400, 'Enter a valid email address.');
    }
    if (username.length > 50 || password.length > 256) {
      return reply(res, 400, 'Username must be at most 50 characters and password at most 256 characters.');
    }
    const exists = () => userStore.some((user) =>
      user.email.toLowerCase() === email || user.username.toLowerCase() === username.toLowerCase(),
    );
    if (exists()) return reply(res, 409, 'An account with this email or username already exists.');
    const passwordHash = await hashPassword(password);
    // Check again after hashing to prevent simultaneous duplicate signups.
    if (exists()) return reply(res, 409, 'An account with this email or username already exists.');
    const user = { id: randomUUID(), email, username, passwordHash };
    userStore.push(user);
    await startSession(req, user.id);
    return reply(res, 201, 'Account created successfully.', user);
  });

  app.post('/api/login', async (req, res) => {
    // Credentials come only from req.body, never params or the query string.
    if (!hasFields(req.body, ['username', 'password'])) {
      return reply(res, 400, 'Username and password are required.');
    }
    if (req.body.username.trim().length > 50 || req.body.password.length > 256) {
      return reply(res, 400, 'Username or password is too long.');
    }
    const user = userStore.find((item) => item.username.toLowerCase() === req.body.username.trim().toLowerCase());
    if (!user || !await verifyPassword(req.body.password, user.passwordHash)) {
      return reply(res, 401, 'Invalid username or password.');
    }
    await startSession(req, user.id);
    return reply(res, 200, 'Logged in successfully.', user);
  });

  app.post('/api/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax', secure: production });
    return reply(res, 200, 'Logged out successfully.');
  });

  app.use('/api', (req, res) => reply(res, 404, 'API endpoint not found.'));

  const loggedIn = (req) => userStore.some((user) => user.id === req.session.userId);
  app.get('/', (req, res) => res.redirect(loggedIn(req) ? '/home.html' : '/signup.html'));
  app.get('/home.html', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!loggedIn(req)) return res.redirect('/login.html');
    return res.sendFile(path.join(directory, 'pages', 'home.html'));
  });
  app.use(express.static(path.join(directory, 'public')));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return reply(res, 400, 'Request body must be valid JSON.');
    if (error.type === 'entity.too.large') return reply(res, 413, 'Request body is too large.');
    console.error('Request failed:', error.message);
    return reply(res, 500, 'An unexpected server error occurred. Please try again.');
  });
  return app;
}
