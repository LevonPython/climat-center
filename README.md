# climat-center

Monorepo for a multi-language climate service website (public site + admin panel) with a Node.js (Express) + PostgreSQL backend.

## Apps

- `server/`: Express API + PostgreSQL
- `client/`: Public website (Next.js)
- `admin/`: Admin panel (Vite + React)

## Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** (v14 or later)

## Database setup

The API uses PostgreSQL. Set up the database once before running the server.

### 1. Install PostgreSQL (macOS with Homebrew)

```bash
brew install postgresql@16
```

### 2. Initialize the data directory (first time only)

If `brew services start` fails with “Bootstrap failed” or “Input/output error”, the data directory may not exist. Initialize it:

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
/usr/local/opt/postgresql@16/bin/initdb -D /usr/local/var/postgresql@16
```

On Apple Silicon Homebrew, the path is usually `/opt/homebrew/var/postgresql@16`.

### 3. Start PostgreSQL

```bash
brew services start postgresql@16
```

If the service was already registered but failed before, restart it after init:

```bash
brew services restart postgresql@16
```

### 4. Create the application database

```bash
/usr/local/opt/postgresql@16/bin/createdb climat_center
```

(Or `createdb climat_center` if `postgresql@16` is on your `PATH`.)

### 5. Create the `postgres` role (if your app uses it)

The default `server/.env.example` connects as user `postgres`. If that role does not exist (e.g. after a fresh initdb), create it:

```bash
/usr/local/opt/postgresql@16/bin/psql -d climat_center -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
```

To use your macOS user instead, set in `server/.env`:

```bash
DATABASE_URL=postgres://YOUR_USERNAME@localhost:5432/climat_center
```

(Replace `YOUR_USERNAME` with your system username; no password for local trust auth.)

### 6. Verify connection

```bash
/usr/local/opt/postgresql@16/bin/psql -d climat_center -c "\l"
```

You should see `climat_center` in the list.

## Local development

1. Install dependencies (repo root):
   ```bash
   npm install
   ```

2. Set up environment:
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` if you use a different database user or password.

3. Run database migrations (creates tables such as `quiz_submissions`, `bookings`, `services`; required for the API and quiz to work):
   ```bash
   npm run migrate -w server
   ```

4. Run apps in separate terminals:
   - API: `npm run dev -w server`
   - Public site: `npm run dev -w client`
   - Admin panel: `npm run dev -w admin`

## Admin panel

The admin app manages **bookings**, **services**, **content**, and **users**. It does not currently include a screen for **quiz submissions**; quiz data is stored via the API and can be listed with `GET /api/quiz-submissions` (requires admin/editor auth). Public site translations (e.g. quiz options in EN/RU/AM) live in `client/public/locales/` and do not affect the admin UI.

## Testing

- **Server** (requires `DATABASE_URL` in `server/.env`):
  ```bash
  npm run test -w server
  ```
  Tests cover auth, bookings, content, and quiz-submissions API. If `DATABASE_URL` is not set, DB-dependent tests are skipped.
- **Client**: `npm run test -w client` (e.g. LanguageSwitcher).
- **Admin**: `npm run test -w admin` (e.g. auth).
