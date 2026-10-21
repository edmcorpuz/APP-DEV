import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Parehong server, iisang .env. Hindi dapat magkaiba ang signing secret.
export const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env'), quiet: true });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters. Run bun run setup first.');
}
export const config = {
  secret: process.env.JWT_SECRET,
  authPort: Number(process.env.AUTH_PORT || 4000),
  blogPort: Number(process.env.BLOG_PORT || 5000),
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5000',
  storageDir: process.env.STORAGE_DIR || path.join(root, '.storage'),
};
