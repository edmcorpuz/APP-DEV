// Optional demo data, created through the real endpoints (never by bypassing auth).
// Only local classroom accounts. Do not reuse this password anywhere else.
import { config } from '../shared/config.js';
const auth = 'http://localhost:' + config.authPort;
const blog = 'http://localhost:' + config.blogPort;
const password = 'StoryTime123!';
const people = [
  ['clara_reader', 'reader'], ['mika_author', 'author'], ['eli_author', 'author'], ['sam_admin', 'admin'],
];
async function call(base, endpoint, method, body, token) {
  const response = await fetch(base + endpoint, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  if (!response.ok && response.status !== 409) throw new Error(data.error);
  return data;
}
const stories = [
  ['mika_author', 'The courage to start again', 'Sometimes the hardest part is the first sentence. We wait for the perfect idea, the perfect time, or a little more confidence.\n\nBut a story only starts when we do. Sugdan lang nato. Let’s begin with what we know and let the rest unfold.\n\nThis week, I’m choosing progress over perfection. One small step is still a step forward.'],
  ['eli_author', 'Finding quiet in a busy week', 'Between deadlines and everyday life, a short walk can be the pause we need. I put my phone away and noticed the afternoon light, the familiar streets, and the sound of people heading home.\n\nNothing extraordinary happened. That was the point.\n\nSometimes a few minutes away help us return with a clearer mind.'],
  ['mika_author', 'Small wins are still wins', 'Today I fixed one bug and finally understood why it happened. It was a small thing, but progress is often made of small things.\n\nDili kinahanglan dako dayon ang progress. What matters is that we keep learning, ask when we need help, and try again.\n\nWhat’s one small win you’re taking with you this week?'],
  ['sam_admin', 'A little curiosity goes a long way', 'The best questions often begin with “what if?” What if we tried another approach? What if the error message is telling us exactly what we need to know?\n\nThis community is a space for discoveries like those. You don’t need to have all the answers to share what you’re learning.\n\nKeep asking. Keep exploring. There’s room for your perspective here.'],
];
try {
  const tokens = {};
  for (const [username, role] of people) {
    await call(auth, '/register', 'POST', { username, password, role });
    tokens[username] = await call(auth, '/login', 'POST', { username, password });
  }
  const existing = await (await fetch(blog + '/api/posts')).json();
  let added = 0;
  for (const [username, title, content] of stories) {
    if (existing.some(post => post.authorName === username && post.title === title)) continue;
    await call(blog, '/api/posts', 'POST', { title, content }, tokens[username].accessToken);
    added++;
  }
  for (const { refreshToken } of Object.values(tokens)) await call(auth, '/logout', 'POST', { refreshToken });
  console.log('Demo ready: ' + added + ' new stories. Existing stories were not overwritten.');
  console.log('Accounts: clara_reader, mika_author, eli_author, sam_admin');
  console.log('Local demo password for all four: ' + password);
  console.log('Seeding replaces these accounts’ refresh tokens; sign in again if needed.');
} catch (error) {
  console.error('Could not seed the demo: ' + error.message);
  console.error('Start both servers first with bun run start. Existing account passwords are never overwritten.');
  process.exitCode = 1;
}
