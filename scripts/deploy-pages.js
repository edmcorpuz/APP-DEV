// Builds the React frontend for GitHub Pages and publishes it to the gh-pages branch.
// The site is served at https://edmcorpuz.github.io/APP-DEV/ (frontend only; the Express
// servers and MariaDB still run on your computer). Run: npm run deploy:pages
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'frontend', 'dist');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim();

run('npm --prefix frontend run build:pages');
// A throwaway repo inside dist holds only the built files; it replaces the gh-pages branch.
rmSync(join(dist, '.git'), { recursive: true, force: true });
run('git init -q -b gh-pages', dist);
run('git add -A', dist);
run('git commit -q -m "Deploy frontend to GitHub Pages"', dist);
run(`git push -f "${remote}" gh-pages`, dist);
rmSync(join(dist, '.git'), { recursive: true, force: true });
console.log('\nPublished. Live at https://edmcorpuz.github.io/APP-DEV/ (allow a minute for GitHub to update).');
