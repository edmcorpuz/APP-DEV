import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');

const app = createApp({
  jwtSecret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === 'production',
});
app.listen(port, () => console.log(`JWT Auth Activity: http://localhost:${port}`));
