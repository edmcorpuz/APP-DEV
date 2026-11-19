import jwt from 'jsonwebtoken';
import { config } from '../../db.js';

// "Who are you?" Verifies the access token locally with the shared secret.
// The Blog API never calls the Auth Server.
export function authenticate(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Missing token. Send Authorization: Bearer <accessToken>.' });

  try {
    const claims = jwt.verify(match[1], config.secret, { algorithms: ['HS256'] });
    if (claims.type === 'refresh') {
      return res.status(401).json({ error: 'Refresh tokens cannot be used here. Send an access token.' });
    }
    if (!claims.id || !claims.username || !['reader', 'author', 'admin'].includes(claims.role)) {
      return res.status(401).json({ error: 'Token is missing required claims.' });
    }
    req.user = { id: claims.id, username: claims.username, role: claims.role };
    next();
  } catch {
    res.status(401).json({ error: 'Access token is invalid or expired.' });
  }
}
