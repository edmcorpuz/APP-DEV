import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const env = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(env)) console.log('.env already exists; left unchanged.');
else {
  writeFileSync(env, 'JWT_SECRET=' + randomBytes(48).toString('hex') + '\nAUTH_PORT=4000\nBLOG_PORT=5000\nFRONTEND_ORIGIN=http://localhost:5000\n');
  console.log('Created shared .env with a random JWT secret. Do not commit it.');
}
