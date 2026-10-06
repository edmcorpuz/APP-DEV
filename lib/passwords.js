import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, passwordHash) {
  const [salt, stored] = String(passwordHash).split(':');
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(stored)) return false;
  const candidate = await deriveKey(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(stored, 'hex'));
}
