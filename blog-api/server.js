import express from 'express';
import path from 'node:path';
import { config, root } from '../shared/config.js';
import { configureApp, errorHandler, notFound } from '../shared/http.js';
import { postRoutes } from './src/routes/postRoutes.js';
const app = express();
configureApp(app);
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' " + config.origin.replace(/:\d+$/, ':' + config.authPort) + "; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  next();
});
app.get('/health', (req, res) => res.json({ service: 'Blog API', status: 'ok' }));
app.get('/config', (req, res) => res.json({ authUrl: config.origin.replace(/:\d+$/, ':' + config.authPort) }));
app.use(postRoutes);
app.use(express.static(path.join(root, 'frontend')));
app.use(notFound);
app.use(errorHandler);
app.listen(config.blogPort, '127.0.0.1', () => console.log('Blog API + frontend ready at http://localhost:' + config.blogPort));
