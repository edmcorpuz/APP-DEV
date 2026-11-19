# Sugilanon Blog Platform — Final Exam

ReactJS frontend → two ExpressJS servers → MariaDB (XAMPP).

| Part | Folder | Port |
|---|---|---|
| Auth Server: register, login, refresh, logout | `auth-server/` | 4000 |
| Blog API: posts with role-based access | `blog-server/` | 5000 |
| React frontend (Vite) | `frontend/` | 5173 |
| MariaDB database `blog_platform` | `database/schema.sql` | 3306 |

The Blog API checks JWTs itself using the shared `JWT_SECRET` in the root `.env`. It never calls the Auth Server.

## Setup (first time)

1. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. In this folder:

   ```sh
   npm run install:all   # installs backend and frontend packages
   npm run setup         # creates .env with a random JWT secret and builds the tables
   ```

   You can also build the tables by hand: open phpMyAdmin (http://localhost/phpmyadmin), go to the **SQL** tab, and paste in `database/schema.sql`.
3. If your XAMPP MySQL root user has a password, put it in `DB_PASSWORD` in `.env`.

## Run

```sh
npm run dev     # starts auth (4000), blog (5000) and React (5173) together
```

Open **http://localhost:5173**. Ctrl+C stops everything.

You can also run each part in its own terminal: `npm run start:auth`, `npm run start:blog`, `npm run start:frontend`.

To fill the database with demo data while the servers are running:

```sh
npm run seed
```

| Username | Role | Password (local demo only) |
|---|---|---|
| clara_reader | reader | StoryTime123! |
| mika_author | author | StoryTime123! |
| eli_author | author | StoryTime123! |
| sam_admin | admin | StoryTime123! |

## Database (schema)

- **roles**: id, role (unique), created_at, updated_at, encoder_id. Seeded with reader, author and admin.
- **users**: id, email (unique), username (unique), password_hash, role_id → roles.id, is_active, created_at, updated_at
- **refresh_tokens**: id, user_id → users.id, token_hash (SHA-256, unique), expires_at, revoked_at, created_at
- **posts**: id, author_id → users.id, title, content, created_at, updated_at

Every id and foreign key is a signed `INT`, so the FK signedness matches (see the schema note).

## API

### Auth Server (http://localhost:4000)

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| POST | /register | username, email, password, role | 201 | 400, 409 |
| POST | /login | username, password → `{ accessToken, refreshToken }` | 200 | 400, 401 |
| POST | /refresh | refreshToken → `{ accessToken }` | 200 | 400, 401 |
| POST | /logout | refreshToken (sets `revoked_at`) | 200 | 400 |

- Access token: `{ id, username, role }`, expires in 15 minutes.
- Refresh token: `{ id, type: "refresh" }`, expires in 7 days. Only its SHA-256 hash goes in `refresh_tokens`.
- Login also sets the refresh token as an **httpOnly cookie** (cookie-parser). That way the React app never stores it in JavaScript. Postman can send it in the JSON body instead.
- Passwords are hashed with a random salt and `scrypt` (node:crypto).
- `/login` and `/register` are rate limited to 20 requests per 15 minutes (express-rate-limit).

### Blog API (http://localhost:5000)

| Method | Endpoint | Who | Success | Errors |
|---|---|---|---|---|
| GET | /api/posts | public | 200 | — |
| GET | /api/posts/:id | public | 200 | 404 |
| POST | /api/posts | author, admin | 201 | 400, 401, 403 |
| PUT | /api/posts/:id | post owner or admin | 200 | 400, 401, 403, 404 |
| DELETE | /api/posts/:id | admin | 200 | 401, 403, 404 |
| GET | /api/me/posts | any logged-in user | 200 | 401 |

- `middleware/authenticate.js`: reads `Authorization: Bearer <token>`, verifies it, sets `req.user`, and rejects refresh tokens (401). It is applied per route, because the GET routes are public.
- `middleware/authorize.js`: `authorize(...roles)` returns 403 for any other role.
- The ownership check (owner or admin) is in `postController.updatePost`.
- `authorId` always comes from the token, never from the request body.

All errors use the shape `{ "error": "message" }`. Both servers use Helmet security headers.

## Folder structure

```
blog-platform/
├── .env / .env.example      shared by both servers
├── database/schema.sql
├── scripts/                 setup, dev (runs all three), seed
├── auth-server/
│   ├── server.js
│   ├── db.js
│   └── src/ routes/ controllers/
├── blog-server/
│   ├── server.js
│   ├── db.js
│   └── src/ routes/ controllers/ middleware/ (authenticate.js, authorize.js)
└── frontend/                React + Vite + Motion
    ├── art/weave.mjs        generates the masthead artwork (node frontend/art/weave.mjs)
    ├── public/art/          woven-broadsheet.svg (used on the site) and .png
    └── src/ AuthContext.jsx, App.jsx, pages/, components/
```

The visual direction (philosophy, colors, fonts, and the reason for each) is in `DESIGN.md`.

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:3306`**: MySQL isn't started in XAMPP.
- **`Access denied for user 'root'`**: set `DB_PASSWORD` in `.env`.
- **`/health` returns 503**: the server is running but can't reach MariaDB.
- **CORS error in the browser**: open the app at http://localhost:5173 (that is `FRONTEND_ORIGIN`).
- **Port in use**: another copy is already running. Stop it first.
