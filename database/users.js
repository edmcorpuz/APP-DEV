import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A small local JSON database. Passwords are stored only as salted hashes.
export function openUserStore(filePath = fileURLToPath(new URL('./users.json', import.meta.url))) {
  const users = existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : [];
  if (!Array.isArray(users) || !users.every((user) =>
    user && ['id', 'email', 'username', 'bio', 'passwordHash'].every((field) => typeof user[field] === 'string'),
  )) {
    throw new Error('Invalid user database. Check database/users.json; it has not been overwritten.');
  }

  function addUser(user) {
    // Save first, so a failed write cannot report a successful signup.
    // Rename a complete file rather than partially overwriting existing accounts.
    const temporaryFile = `${filePath}.tmp`;
    writeFileSync(temporaryFile, JSON.stringify([...users, user], null, 2), { mode: 0o600 });
    renameSync(temporaryFile, filePath);
    users.push(user);
  }

  return { users, addUser };
}
