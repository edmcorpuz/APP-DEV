// Starts the Auth Server, the Blog API and the React dev server together. Ctrl+C stops all three.
import { spawn } from 'node:child_process';

// Each entry is one full command line; the shell is needed on Windows to find npm.
const processes = [
  ['auth', 'node auth-server/server.js'],
  ['blog', 'node blog-server/server.js'],
  ['web ', 'npm --prefix frontend run dev'],
].map(([name, commandLine]) => {
  const child = spawn(commandLine, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const print = stream => data => String(data).trimEnd().split('\n').forEach(line => stream.write(`[${name}] ${line}\n`));
  child.stdout.on('data', print(process.stdout));
  child.stderr.on('data', print(process.stderr));
  child.on('exit', code => console.log(`[${name}] exited with code ${code}`));
  return child;
});

const stop = () => { processes.forEach(child => child.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
