// One-time setup: creates .env (with a random JWT secret) and builds the MariaDB tables.
// Start MySQL in the XAMPP Control Panel before running this.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = root + '.env';

if (!existsSync(envPath)) {
  const template = readFileSync(root + '.env.example', 'utf8');
  writeFileSync(envPath, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`));
  console.log('Created .env with a random JWT_SECRET.');
} else {
  console.log('.env already exists, leaving it as is.');
}
dotenv.config({ path: envPath, quiet: true });

const dbName = process.env.DB_NAME || 'blog_platform';
const sql = readFileSync(root + 'database/schema.sql', 'utf8').replaceAll('blog_platform', dbName);

try {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  await connection.query(sql);
  const [tables] = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
  await connection.end();
  console.log(`Database "${dbName}" is ready: ${tables.map(t => Object.values(t)[0]).join(', ')}`);
} catch (error) {
  console.error(`\nCould not set up the database: ${error.message}`);
  console.error('Is MySQL started in the XAMPP Control Panel? Check DB_* values in .env.');
  process.exit(1);
}
