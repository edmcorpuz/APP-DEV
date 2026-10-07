import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const cookieName = 'appdev.token';

export function createAuth({ secret, userStore, production }) {
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: production, path: '/' };

  function setToken(res, user) {
    // Only an ID goes in the token. Profile details stay on the server.
    const token = jwt.sign({}, secret, {
      algorithm: 'HS256',
      subject: user.id,
      jwtid: randomUUID(),
      expiresIn: '1h',
    });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  }

  function clearToken(res) {
    res.clearCookie(cookieName, cookieOptions);
  }

  function requireAuth(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
      // verify checks the signature and expiration; decode alone is not enough.
      const payload = jwt.verify(req.cookies[cookieName] || '', secret, { algorithms: ['HS256'] });
      if (!Number.isInteger(payload.exp)) throw new Error('Token has no expiration.');
      req.user = userStore.find((user) => user.id === payload.sub);
    } catch {
      req.user = undefined;
    }

    if (!req.user) {
      clearToken(res);
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ status: 401, message: 'Please log in. Your token is missing, invalid, or expired.' });
      }
      return res.redirect('/login.html');
    }
    next();
  }

  return { setToken, clearToken, requireAuth };
}
