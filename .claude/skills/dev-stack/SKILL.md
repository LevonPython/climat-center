---
name: dev-stack
description: Start and verify the local stack (Postgres, API on 5000, public site on 3000, admin on 5173). Use when asked to run, start or open the app, set up a new machine, confirm a change works in the real app, or when a service won't start.
---

# Local stack

## First-time setup
Skip any step that is already done.

```bash
npm install
brew services start postgresql@16
"$(brew --prefix postgresql@16)/bin/createdb" climat_center
cp -n server/.env.example server/.env
cp -n client/.env.example client/.env.local
cp -n admin/.env.example admin/.env
npm run migrate -w server
npm run seed -w server
```

`psql`, `createdb` and `pg_isready` are not on PATH with the Homebrew keg, so use the `brew --prefix` path. `.env` files are off-limits to Claude's file tools. If one needs editing, ask the user to do it.

## Start
Check first, because a service may already be running:

```bash
curl -s -m 2 localhost:5000/api/health
```

Start what is missing, each as a separate background process:

```bash
npm run dev -w server
npm run dev -w client
npm run dev -w admin
```

## Verify

```bash
curl -s localhost:5000/api/health
curl -s localhost:5000/api/content/am
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/en
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/ru
curl -s -o /dev/null -w '%{http_code}\n' localhost:5173/
```

- Health returns `{"ok":true,...}` and content returns a `pages` object.
- `/` is Armenian (the default locale); `/en` and `/ru` are the other two.
- Local admin login comes from the seed: `admin` / `admin12345`, unless `SEED_ADMIN_USERNAME` or `SEED_ADMIN_PASSWORD` were set.

For a UI change, open the affected screen and read it in Armenian at 360px width as well as desktop.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED` from the API | Postgres is stopped | `brew services restart postgresql@16` |
| `relation ... does not exist` | Migrations not applied | `npm run migrate -w server` |
| Admin Content page is empty or partial | Seed never overwrites | `db-content-reset` skill |
| Site shows only `t()` fallback text | API was down when the page fetched | Start the API and reload |
| Port already in use | Another process holds it | `lsof -i :5000`, then ask before killing anything you didn't start |
