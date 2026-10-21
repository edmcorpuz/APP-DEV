import express from 'express';
import cors from 'cors';
import { config } from './config.js';

export function configureApp(app) {
  app.disable('x-powered-by');
  app.use(cors({ origin: config.origin }));
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path !== '/' && !req.path.match(/\.(css|js|svg)$/)) res.setHeader('Cache-Control', 'no-store');
    next();
  });
}
export function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Please send valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large.' });
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
export const notFound = (req, res) => res.status(404).json({ error: 'That endpoint does not exist.' });
export const isText = value => typeof value === 'string' && value.trim().length > 0;
