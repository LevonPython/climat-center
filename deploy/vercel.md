# Deployment on Vercel + Neon

The repo is an npm workspaces monorepo. Deploy **three separate Vercel projects** from the **same GitHub repository**, each with a different **Root Directory**.

Neon: create the database, then run migrations and seed locally (or from CI) against `DATABASE_URL` before relying on production traffic:

```bash
DATABASE_URL="<neon-connection-string>" npm run migrate -w server
DATABASE_URL="<neon-connection-string>" npm run seed -w server
```

## 1. API — `climat-center-server`

| Setting | Value |
|--------|--------|
| Root Directory | `server` |
| Framework Preset | Other |
| Build Command | *(empty)* |
| Output Directory | *(empty)* |
| Install Command | `npm install --prefix=..` |

Runs Express via [`server/api/index.js`](../server/api/index.js) and [`server/vercel.json`](../server/vercel.json) (catch-all rewrite to `/api`).

### Environment variables

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon connection string (`sslmode=require` in URL is fine) |
| `JWT_SECRET` | Strong secret |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Comma-separated browser origins, e.g. `https://<client>.vercel.app,https://<admin>.vercel.app` — **required** for browser calls from client/admin |
| `PUBLIC_SITE_URL` | Public site origin, e.g. `https://<client>.vercel.app` (ISR revalidation) |
| `REVALIDATE_SECRET` | Shared with the Next.js project |
| `BLOB_READ_WRITE_TOKEN` | Enable Vercel Blob for `/api/upload` (create a Blob store in the Vercel project; token is auto-injected or set manually) |

Optional: `UPLOAD_DIR`, `MAX_UPLOAD_MB` (local-style uploads only apply when Blob token is not set; on Vercel prefer Blob).

Deploy the **server first**, note the production URL (e.g. `https://climat-center-server.vercel.app`).

## 2. Public site — `climat-center-client`

| Setting | Value |
|--------|--------|
| Root Directory | `client` |
| Framework Preset | Next.js |

### Environment variables

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Server URL, e.g. `https://<server>.vercel.app` (no trailing slash) |
| `REVALIDATE_SECRET` | Same value as on the server |

## 3. Admin — `climat-center-admin`

| Setting | Value |
|--------|--------|
| Root Directory | `admin` |
| Framework Preset | Vite |

### Environment variables

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | Same server URL as `NEXT_PUBLIC_API_URL` |

[`admin/vercel.json`](../admin/vercel.json) rewrites unknown paths to `index.html` for client-side routing.

## 4. After all three URLs exist

1. Set **`CORS_ORIGINS`** on the server to the exact **https** origins of the client and admin deployments (and any custom domains).
2. Redeploy the server if you change CORS or secrets.

## GitHub

Connect the repo in each Vercel project (**Import Git Repository**). No extra GitHub Actions are required for deploy; optional: add a workflow that only runs tests (existing [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Operational notes

- **Schema changes**: run `npm run migrate -w server` locally (or in CI) against Neon; there is no automatic migrate on Vercel deploy.
- **Uploads**: with `BLOB_READ_WRITE_TOKEN` set, uploads go to Vercel Blob and return public `https://…` URLs. Without it, the API expects a writable disk (not suitable for serverless).
