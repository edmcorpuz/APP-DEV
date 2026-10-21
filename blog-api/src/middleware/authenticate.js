import jwt from 'jsonwebtoken';
import { config } from '../../../shared/config.js';

// Authentication = kinsa ka? Verify locally; NEVER call the Auth Server here.
export function authenticate(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Please sign in with a Bearer access token.' });
  try {
    const claims = jwt.verify(match[1], config.secret, { algorithms: ['HS256'] });
    if (claims.type === 'refresh' || !claims.id || !claims.username || !['reader', 'author', 'admin'].includes(claims.role)) {
      return res.status(401).json({ error: 'An access token is required. Refresh tokens cannot access the Blog API.' });
    }
    req.user = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Your access token is invalid or expired.' });
  }
}
