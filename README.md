# Sugilanon — stories worth sharing

Full frontend + two Express backend servers for the App Dev midterm. **Sugilanon** means “story” in Bisaya.

## Start here

From this folder:

```sh
bun install
bun run setup
bun run start
```

Open **http://localhost:5000** (use this exact origin, not a file:// URL).
Both servers run as separate processes:
- **4000:** Auth Server — register, login, refresh, logout
- **5000:** Blog API — public reading, protected writing, and static frontend

The supplied Windows `START-APP.cmd` in the parent folder also starts the app.
Keep its terminal open. Ctrl+C stops both servers.

For a populated presentation, open a second terminal in this folder and run:

```sh
bun run seed
```

| Username | Role | Demo password |
|---|---|---|
| clara_reader | reader | StoryTime123! |
| mika_author | author | StoryTime123! |
| eli_author | author | StoryTime123! |
| sam_admin | admin | StoryTime123! |

These are optional, **local classroom credentials**, not production accounts. Seeding uses the real APIs. It adds missing sample titles without overwriting existing stories. It logs into these accounts, replacing old refresh tokens; sign in again afterward. Run seed once before rehearsal, not halfway through a live demo.

## Runtime note

Dependencies and scripts use **Bun 1.3.13**, managed with mise, as required by this workstation’s tooling policy. Backend source uses **Node.js APIs** (native `node:crypto`, `node:path`, `node:fs`, etc.), Express, jsonwebtoken and dotenv, with no Bun-specific APIs. The test runner alone uses `bun:test`.

The assignment explicitly names Node.js. For a professor who requires the **actual Node runtime** rather than Node-compatible Bun execution, the same two entry points are Node-compatible: `auth-server/server.js` and `blog-api/server.js`. Confirm that runtime expectation before presentation; do not claim that Bun itself is Node.js.

## Test

```sh
bun run test
bun run test:ui
bun run test:collection
```

- API suite: isolated ports 14000/15000, temporary storage; never modifies presentation records.
- UI suite: ports 14001/15001 and Chrome debug port 19222; temporary browser profile.
- Browser tests use installed Chrome or Edge in a standard Windows location, controlled over Chrome DevTools Protocol with native WebSocket. No browser-test cloud service is used.
- UI artifacts are saved in `artifacts/`: desktop/mobile screenshots, architecture screenshot, JSON test summary.
- `docs/TEST-RESULTS.md` records the verification actually performed.
- `docs/Sugilanon.postman_collection.json` is importable into Postman. Run in order on your local demo servers. It creates separate test accounts/posts and uses no shared JWT secret.

## Complete frontend

- Public story feed, detail view, search and friendly empty/error states
- Registration with role selection, login, logout
- “My stories” for every signed-in role
- Author publishing and own-post editing
- Admin publishing, editing any post, deleting with a confirmation dialog
- Account screen with manual token renewal, plus automatic refresh/retry
- About screen with live health checks for both servers
- Responsive mobile layout, form labels, keyboard focus, live status messages
- User content escaped as text, never treated as HTML

## Requirements map

| Requirement | Implementation |
|---|---|
| Two Express servers | `auth-server/server.js`, `blog-api/server.js` |
| Shared root .env using explicit dotenv path | `shared/config.js` |
| Native crypto password hashing | `authController.js`: random salt + scrypt + timingSafeEqual |
| Access JWT: id, username, role; 15 minutes | `accessToken()` in auth controller |
| Refresh JWT: same secret, type refresh; 7 days | `login()` in auth controller |
| Stored refresh token + revoked_at checks | `refresh()`, `logout()` |
| Independent Blog verification | `authenticate.js`; no Auth HTTP calls |
| Role middleware | `authorize.js` |
| Ownership | `updatePost()`; owner or admin |
| Admin-only deletion | `postRoutes.js`, DELETE route uses authorize('admin') |
| Arrays + localStorage persistence | `shared/storage.js`, models |
| Uniform errors | `{ "error": "message" }`, including bad JSON and unknown paths |
| Distinct routes/controllers/middleware folders | Both server folders |
| Full UI integration | `frontend/app.js` calls all ten required endpoints |

The handout’s abbreviated post model is incomplete and inconsistent with its endpoint table. This implementation follows the endpoint contract and uses `id, authorId, authorName, title, content, created_at, updated_at`. It includes all fields required to read, edit, and check ownership.

## Storage: two different meanings of localStorage

Servers have no browser window. The `node-localstorage` package implements the localStorage API with files:

- `.storage/users/users`: Auth user array
- `.storage/posts/posts`: Blog post array

Each process reads its array once at startup and saves after modifications. Separate folders mean the Blog server never reads the user store. Corrupt storage fails startup instead of silently deleting records.

The browser uses its own localStorage for `sugilanon.session`. It stores only the access/refresh session pair. It is **not** the authoritative user/post database.

Do not run two Auth instances against the same storage directory. This classroom persistence mechanism is not a database or a multi-writer solution.

## Security boundaries you should explain honestly

- Public GET routes require no token.
- A valid access token is required on every protected route.
- Refresh tokens are explicitly rejected by Blog even though the signature is valid.
- Role checks and ownership checks happen on the backend. Hiding buttons is not security.
- Create obtains authorId and authorName from the verified token, not request body.
- Only title/content can be edited; ownership cannot be reassigned.
- Passwords are salted scrypt hashes. Hashing is not reversible encryption.
- Logout revokes the saved refresh token, **not an already-issued access token**. Blog is stateless and independent; access expires within 15 minutes.
- One saved refresh token per user means one refresh session at a time. A new login replaces the old refresh token.
- Registration permits choosing admin because the exam requires it; this is unsafe for production.
- Browser localStorage tokens are vulnerable if XSS occurs. Text escaping and CSP help, but production should consider secure HttpOnly cookies and CSRF protections.
- Local HTTP, no rate limiter, file-backed records, synchronous hashing and HS256 shared secret are classroom choices. Do not deploy this unchanged to the public internet.
- Production improvements: HTTPS, restricted admin provisioning, rate limiting, async hashing, a database, protected token storage, key rotation and a defined revocation strategy.
- Changing JWT_SECRET invalidates all existing tokens.

## Troubleshooting

- **Missing secret:** run `bun run setup`. Existing .env is deliberately never overwritten. Use a random secret of at least 32 characters, shared by both servers.
- **Port already in use:** stop the old copy before starting a new one. Do not close unrelated services.
- **Cannot connect:** open http://localhost:4000/health and http://localhost:5000/health. Keep both terminal processes running.
- **CORS failure:** use http://localhost:5000. The default config intentionally allows that origin.
- **Refresh rejected:** sign in again. The token may have expired, been revoked, or been replaced by another login.
- **403:** you are signed in, but your role/ownership does not permit the action.
- **Data remains after restart:** this is expected; persistence is required.
- **Want a clean rehearsal:** stop servers and back up .storage before manually moving it aside. No destructive reset runs automatically.
- **Runtime resolution issue:** run `mise doctor`. Versions belong in `.mise.toml`; do not edit PATH manually.

## Presentation material

In the parent **appdev midterm** folder:
- `PRESENTATION-GUIDE.pdf` — cheat sheet, timed speech, code walkthrough, Q&A, troubleshooting
- `PRESENTATION-GUIDE.txt` — searchable plain-text copy
- `START-HERE.txt` — quick setup and submission reminders

Copies of the PDF and its editable text source are also in `docs/`, so they stay with the Git repository. Regenerate the PDF with `bun run guide`.

## Submission

The repository is initialized on **midterm-exam**. A GitHub remote was not supplied, so **nothing has been pushed or published**. Create/select your own GitHub repository, add its URL as `origin`, and push this branch when ready. Never add .env, .storage, node_modules or browser session tokens.

The full-stack +3 is evaluated by your professor; implementation and tests do not guarantee a grade.
