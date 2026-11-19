import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool, config } from '../../db.js';

const ROLES = ['reader', 'author', 'admin'];
const REFRESH_DAYS = 7;
const refreshCookie = {
  httpOnly: true, // JavaScript in the page can never read it
  sameSite: 'lax',
  secure: false, // local http; set true behind HTTPS
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
};

const isText = value => typeof value === 'string' && value.trim().length > 0;
const body = req => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});
// We never store the raw refresh token, only its SHA-256 (64 hex chars = CHAR(64) column).
const sha256 = value => createHash('sha256').update(value).digest('hex');
// Accept the refresh token from the JSON body (Postman) or the httpOnly cookie (React app).
const readRefreshToken = req => body(req).refreshToken || req.cookies?.refreshToken;

// One-way password hashing with a random salt: stored as "salt:hash".
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function matchesPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64));
}

const signAccessToken = user => jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  config.secret,
  { algorithm: 'HS256', expiresIn: '15m' },
);

// POST /register  { username, email, password, role }
export async function register(req, res) {
  const { username, email, password, role } = body(req);
  if (!isText(username) || !isText(email) || !isText(password) || !isText(role)) {
    return res.status(400).json({ error: 'Username, email, password and role are required.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be reader, author or admin.' });
  }
  const name = username.trim();
  const mail = email.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(name)) {
    return res.status(400).json({ error: 'Username must be 3–50 letters, numbers or underscores.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 255) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8–128 characters.' });
  }

  const [taken] = await pool.query(
    'SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1', [name, mail],
  );
  if (taken.length) {
    const field = taken[0].username.toLowerCase() === name.toLowerCase() ? 'username' : 'email';
    return res.status(409).json({ error: `That ${field} is already taken.` });
  }

  const [[roleRow]] = await pool.query('SELECT id FROM roles WHERE role = ?', [role]);
  if (!roleRow) return res.status(500).json({ error: 'Roles are missing. Run `npm run setup`.' });

  try {
    const [result] = await pool.query(
      'INSERT INTO users (email, username, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
      [mail, name, hashPassword(password), roleRow.id],
    );
    res.status(201).json({
      message: 'Account created. You can log in now.',
      user: { id: result.insertId, username: name, email: mail, role },
    });
  } catch (error) {
    // Two requests racing for the same username: the UNIQUE index catches it.
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That username or email is already taken.' });
    throw error;
  }
}

// POST /login  { username, password }  ->  { accessToken, refreshToken }
export async function login(req, res) {
  const { username, password } = body(req);
  if (!isText(username) || !isText(password)) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const [[user]] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.is_active, r.role
       FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?`,
    [username.trim()],
  );
  if (!user || !matchesPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  if (!user.is_active) return res.status(401).json({ error: 'This account has been deactivated.' });

  // type: 'refresh' marks it so the Blog API can refuse it. jti keeps every token unique.
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.secret,
    { algorithm: 'HS256', expiresIn: `${REFRESH_DAYS}d`, jwtid: randomUUID() },
  );
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
    [user.id, sha256(refreshToken), REFRESH_DAYS],
  );

  res.cookie('refreshToken', refreshToken, refreshCookie);
  res.json({ accessToken: signAccessToken(user), refreshToken });
}

// POST /refresh  { refreshToken }  ->  { accessToken }
export async function refresh(req, res) {
  const refreshToken = readRefreshToken(req);
  if (!isText(refreshToken)) return res.status(400).json({ error: 'A refresh token is required.' });

  let claims;
  try {
    claims = jwt.verify(refreshToken, config.secret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Refresh token is invalid or expired. Please log in again.' });
  }
  if (claims.type !== 'refresh') return res.status(401).json({ error: 'That is not a refresh token.' });

  // A valid signature is not enough: the token must still be in the table, unrevoked and unexpired.
  const [[row]] = await pool.query(
    `SELECT u.id, u.username, u.is_active, r.role
       FROM refresh_tokens t
       JOIN users u ON u.id = t.user_id
       JOIN roles r ON r.id = u.role_id
      WHERE t.token_hash = ? AND t.user_id = ? AND t.revoked_at IS NULL AND t.expires_at > NOW()`,
    [sha256(refreshToken), claims.id],
  );
  if (!row || !row.is_active) {
    return res.status(401).json({ error: 'Refresh token has been revoked. Please log in again.' });
  }
  res.json({ accessToken: signAccessToken(row) });
}

// POST /logout  { refreshToken }  ->  revokes the token (sets revoked_at)
export async function logout(req, res) {
  const refreshToken = readRefreshToken(req);
  if (!isText(refreshToken)) return res.status(400).json({ error: 'A refresh token is required.' });

  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
    [sha256(refreshToken)],
  );
  res.clearCookie('refreshToken', { ...refreshCookie, maxAge: undefined });
  // Safe to call twice. Already-issued access tokens simply expire within 15 minutes.
  res.json({ message: 'Logged out.' });
}
