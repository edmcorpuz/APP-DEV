# User Signup & Login — REST API Activity

A basic Express.js backend and three simple HTML pages. All API endpoints use
**POST**. Browsers use GET only to load the HTML, CSS, and JavaScript files.

**Submission branch:**
https://github.com/edmcorpuz/APP-DEV/tree/rest-api-activity

## Run

Runtime: Bun 1.3.13 (pinned in `.mise.toml`).

```sh
mise install
bun install
bun run dev
```

Open **http://localhost:3000**. Create an account, log out, then log back in.
Successful signup and login both redirect to `/home.html`.

For a normal server without file watching, use `bun run start`.
Optional environment variables are documented in `.env.example`.

## API and status codes

Send JSON with `Content-Type: application/json`.

| Endpoint | Request body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/signup` | `email`, `username`, `password` | **201 Created** | **400** missing/blank/invalid fields; **409** existing email or username |
| `POST /api/login` | `username`, `password` | **200 OK** | **400** missing/blank fields; **401** wrong credentials or nonexistent user |
| `POST /api/logout` | None | **200 OK** | Invalidates the session |

API methods other than POST return **405** with `Allow: POST`.
Malformed JSON returns **400**; oversized JSON returns **413**.
Credentials are taken exclusively from the request **body**, not URL params or
query strings. Email and username uniqueness is case-insensitive. Surrounding
email/username whitespace is removed; nonempty passwords are not trimmed.

Example signup JSON:

```json
{
  "email": "student@example.com",
  "username": "student",
  "password": "demo-password"
}
```

Example login JSON:

```json
{
  "username": "student",
  "password": "demo-password"
}
```

Response bodies include a numeric status and readable message. Successful
responses additionally contain the public user (`id`, `email`, `username`).
Password hashes are never returned. For example, a duplicate signup returns:

```json
{
  "status": 409,
  "message": "An account with this email or username already exists."
}
```

The forms display the actual HTTP status code and error message, disable their
submit button while waiting, and report network errors without clearing fields.
Empty-form submission reaches the API so the required **400** response can be
seen directly on the page.

## Demo database and authentication

`database/users.js` exports the separate **users array**, as required. Each
entry is a JSON-compatible object keyed by a unique `id`:

```js
{ id, email, username, passwordHash }
```

Passwords use salted scrypt hashes, not plaintext. Signup and login establish
an HTTP-only, SameSite session cookie. The backend protects the homepage;
logout destroys the session. Nothing sensitive is saved in browser storage.

**Classroom demo only:** users and sessions exist only in server memory and
reset on restart. There is no database persistence, email verification, password
reset, rate limiting, or production-grade session storage. Express-session's
MemoryStore is for development only. Production requires a durable database,
session store, HTTPS, a strong `SESSION_SECRET`, and additional security controls.

## Structure

```text
app.js                 Express app, POST endpoints, status codes, sessions
server.js              Server entry point
database/users.js      Separate JSON-compatible demo users array
lib/passwords.js       Password hashing and verification
public/                Signup/login HTML, CSS, browser JavaScript
pages/home.html        Protected simple homepage (not publicly static)
test/auth.test.js      Real HTTP integration tests
.vscode/               Run/debug configuration and recommended extension
```

## Test

```sh
bun run test
```

Tests use a fresh in-memory users array and a real Express server per test.
They cover signup, login, the required status codes, missing/blank/non-string
fields, duplicate usernames/emails, concurrent duplicate signup, unique IDs,
password hashing, body-only credentials, sessions, logout, static pages,
malformed JSON, and POST-only API enforcement.
