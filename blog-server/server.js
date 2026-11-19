import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool, config } from './db.js';
import { postRoutes } from './src/routes/postRoutes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.origin }));
app.use(express.json({ limit: '64kb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ service: 'Blog API', status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ service: 'Blog API', status: 'degraded', database: 'unreachable' });
  }
});

app.use('/api', postRoutes);

app.use((req, res) => res.status(404).json({ error: 'That endpoint does not exist.' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Please send valid JSON.' });
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(config.port, () => console.log(`Blog API ready at http://localhost:${config.port}`));
