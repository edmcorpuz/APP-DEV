import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { pool, config } from './db.js';
import { authRoutes } from './src/routes/authRoutes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
// credentials: true lets the browser send the httpOnly refresh cookie to this server.
app.use(cors({ origin: config.origin, credentials: true }));
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// Slow down password guessing: 20 login/register attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
app.use(['/login', '/register'], authLimiter);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ service: 'Auth Server', status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ service: 'Auth Server', status: 'degraded', database: 'unreachable' });
  }
});

app.use(authRoutes);

app.use((req, res) => res.status(404).json({ error: 'That endpoint does not exist.' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Please send valid JSON.' });
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(config.port, () => console.log(`Auth Server ready at http://localhost:${config.port}`));
