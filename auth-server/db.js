import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';

// Both servers read the SAME .env in the project root, so they share one JWT secret.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Run `npm run setup` first.');
}

// A pool reuses connections to MariaDB (XAMPP) instead of opening one per request.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blog_platform',
  waitForConnections: true,
  connectionLimit: 10,
});

export const config = {
  secret: process.env.JWT_SECRET,
  port: Number(process.env.AUTH_PORT || 4000),
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
};
