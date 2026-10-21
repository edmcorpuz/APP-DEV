import { LocalStorage } from 'node-localstorage';
import path from 'node:path';
import { config } from './config.js';

// Node has no browser window. This localStorage implementation writes to disk.
// Ang array ang working copy; localStorage ang tipiganan after restart.
export function createStore(name) {
  const localStorage = new LocalStorage(path.join(config.storageDir, name), 20 * 1024 * 1024);
  const raw = localStorage.getItem(name);
  const records = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(records)) throw new Error('Invalid saved ' + name + ' data.');
  return { records, save: () => localStorage.setItem(name, JSON.stringify(records)) };
}
