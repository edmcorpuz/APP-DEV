import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';

import { hashPassword, verifyPassword } from './lib/passwords.js';
import { createAuth } from './lib/auth.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const publicUser = ({ id, email, username, bio }) => ({ id, email, username, bio });
const reply = (res, status, message, user) => res.status(status).json({
  status,
  message,
  ...(user ? { user: publicUser(user) } : {}),
});
const hasFields = (body, fields) => fields.every((field) =>
  typeof body?.[field] === 'string' && body[field].trim().length > 0,
);

export function createApp({ userStore = [], addUser = (user) => userStore.push(user), jwtSecret, production = false } = {}) {
  if (production && (!jwtSecret || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  const app = express();
  const { setToken, clearToken, requireAuth } = createAuth({
    secret: jwtSecret || randomBytes(32).toString('hex'),
    userStore,
    production,
  });
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/signup', async (req, res) => {
    if (!hasFields(req.body, ['email', 'username', 'password'])) {
      return reply(res, 400, 'Email, username, and password are required.');
    }
    const email = req.body.email.trim().toLowerCase();
    const username = req.body.username.trim();
    const password = req.body.password;
    const bio = req.body.bio ?? '';
    if (typeof bio !== 'string' || bio.length > 500) {
      return reply(res, 400, 'Bio must be text with at most 500 characters.');
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(res, 400, 'Enter a valid email address.');
    }
    if (username.length > 50 || password.length > 256) {
      return reply(res, 400, 'Username must be at most 50 characters and password at most 256 characters.');
    }
    const exists = () => userStore.some((user) =>
      [user.email.toLowerCase(), user.username.toLowerCase()].some((identifier) =>
        identifier === email || identifier === username.toLowerCase(),
      ),
    );
    if (exists()) return reply(res, 409, 'An account with this email or username already exists.');
    const passwordHash = await hashPassword(password);
    // Check again after hashing to prevent simultaneous duplicate signups.
    if (exists()) return reply(res, 409, 'An account with this email or username already exists.');
    const user = { id: randomUUID(), email, username, bio: bio.trim(), passwordHash };
    addUser(user);
    setToken(res, user);
    return reply(res, 201, 'Account created successfully.', user);
  });

  app.post('/api/login', async (req, res) => {
    // Credentials come only from req.body, never params or the query string.
    if (!hasFields(req.body, ['username', 'password'])) {
      return reply(res, 400, 'Username or email and password are required.');
    }
    const identifier = req.body.username.trim().toLowerCase();
    if (identifier.length > 254 || req.body.password.length > 256) {
      return reply(res, 400, 'Username, email, or password is too long.');
    }
    const user = userStore.find((item) =>
      item.username.toLowerCase() === identifier || item.email.toLowerCase() === identifier,
    );
    if (!user || !await verifyPassword(req.body.password, user.passwordHash)) {
      return reply(res, 401, 'Invalid username, email, or password.');
    }
    setToken(res, user);
    return reply(res, 200, 'Logged in successfully.', user);
  });

  app.post('/api/logout', (req, res) => {
    clearToken(res);
    return reply(res, 200, 'Logged out successfully.');
  });

  app.get('/api/me', requireAuth, (req, res) => reply(res, 200, 'Your profile.', req.user));
  app.get('/api/users', requireAuth, (req, res) => {
    res.json({ status: 200, users: userStore.map(publicUser) });
  });

  app.all(['/api/signup', '/api/login', '/api/logout'], (req, res) => {
    res.set('Allow', 'POST');
    return reply(res, 405, 'This endpoint only accepts POST requests.');
  });
  app.all(['/api/me', '/api/users'], (req, res) => {
    res.set('Allow', 'GET, HEAD');
    return reply(res, 405, 'This endpoint only accepts GET requests.');
  });
  app.use('/api', (req, res) => reply(res, 404, 'API endpoint not found.'));

  app.get('/', (req, res) => res.redirect('/home.html'));
  app.get('/home.html', requireAuth, (req, res) => res.sendFile(path.join(directory, 'pages', 'home.html')));
  app.get(['/about', '/about.html'], requireAuth, (req, res) => res.sendFile(path.join(directory, 'pages', 'about.html')));
  app.get(['/users', '/users.html'], requireAuth, (req, res) => res.sendFile(path.join(directory, 'pages', 'users.html')));
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
