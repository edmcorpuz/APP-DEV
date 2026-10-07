# JWT Auth Activity

A simple Express application with plain HTML, CSS, and JavaScript. Built on the
previous signup/login activity, with JWT authentication instead of sessions.

**Submission link:** https://github.com/edmcorpuz/APP-DEV/tree/jwt-auth-routes

## Run locally

Use Bun 1.3.13 (pinned in `.mise.toml`).

```sh
mise install
bun install
bun run dev
```

Open **http://localhost:3000** and choose **Create an account**. Enter a username,
email, password, and optional bio. After signup or login, use the navigation to
visit **About Me** and **Users**. Create a second account to see both users listed.

- `bun run start` runs without file watching.
- `bun run test` runs the automated tests.
- VS Code includes a Bun launch configuration and tasks.
- `.env.example` documents optional settings. Bun loads a local `.env` automatically.

## Activity requirements

- **JWT middleware:** `requireAuth` in `lib/auth.js` verifies the token signature,
  expiration, and registered user before allowing access.
- **Expiry:** `jwt.sign` uses `expiresIn: '1h'`.
- **About Me:** `/about` shows the logged-in user's username, email, and bio.
- **Users:** `/users` shows all registered users. Passwords and hashes are excluded.
- **Branch:** `jwt-auth-routes`.

## Routes

| Method | Route | Purpose | Login required |
| --- | --- | --- | --- |
| POST | `/api/signup` | Create an account and issue a JWT | No |
| POST | `/api/login` | Verify credentials and issue a JWT | No |
| POST | `/api/logout` | Clear the JWT cookie | No |
| GET | `/home.html` | Homepage with navigation | Yes |
| GET | `/about` | About Me page (`/about.html` also works) | Yes |
| GET | `/users` | Users page (`/users.html` also works) | Yes |
| GET | `/api/me` | Current user's public profile | Yes |
| GET | `/api/users` | All registered users' public profiles | Yes |

Signup accepts JSON containing `username`, `email`, `password`, and optional `bio`
(up to 500 characters). Login accepts `username` and `password`. Authentication
responses include a message and the public user; the JWT is sent in a cookie.

Protected pages redirect to login if the token is missing, invalid, or expired.
Protected APIs return **401** instead. Signup returns **201**, invalid input
**400**, duplicate accounts **409**, and incorrect login credentials **401**.

## How authentication works

1. Passwords are hashed with salted scrypt before being stored.
2. Signup/login signs a JWT containing the user's ID, a unique token ID, and expiry.
3. The browser stores it in an **HttpOnly, SameSite=Lax** cookie, not local storage.
4. The middleware verifies it with `jwt.verify` and the allowed `HS256` algorithm.
5. Each protected route receives the authenticated user through `req.user`.

Protected HTML is kept in `pages/`, outside the public static directory. User data
is displayed with `textContent` to prevent HTML injection. APIs and protected
pages use `Cache-Control: no-store`.

## Project files

```text
app.js                 Express routes and input validation
server.js              Starts the server
lib/auth.js            JWT creation and authentication middleware
lib/passwords.js       Password hashing and verification
database/users.js      In-memory user array
pages/                 Protected Home, About Me, and Users pages
public/                Login/signup pages, CSS, and browser scripts
test/                  Signup/login and JWT route tests
```

## Classroom-demo limitations

- Accounts are stored in memory and disappear when the server restarts. No database
  setup is needed. Do not enter real passwords or private profile information.
- Without `JWT_SECRET`, development generates a random signing secret on startup.
  Restarting therefore invalidates existing tokens as well as clearing users.
- Logout deletes the browser cookie. A previously copied JWT remains valid until
  its one-hour expiry; this small demo does not implement a token revocation list.
- Production mode requires HTTPS and a random `JWT_SECRET` of at least 32 characters;
  it sets the cookie's `Secure` flag. A deployed service would also need persistent
  storage, login rate limiting, and token revocation.

Submit the **branch-specific link above** in Daigler, as requested in the activity.
