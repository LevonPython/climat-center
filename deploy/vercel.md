# Deployment on Vercel + Neon

The repo is an npm workspaces monorepo. Deploy **three separate Vercel projects** from the **same GitHub repository**, each with a different **Root Directory**.

Neon: create the database, then run migrations and seed locally (or from CI) against `DATABASE_URL` before relying on production traffic:

```bash
DATABASE_URL="<neon-connection-string>" npm run migrate -w server
SEED_ADMIN_PASSWORD="<strong-password>" DATABASE_URL="<neon-connection-string>" npm run seed -w server
```

On a remote database the seed skips the admin user unless `SEED_ADMIN_PASSWORD` is set. To create an admin or replace a password later, run this. It generates a password, prints it once, and says which database it changed. Without `DATABASE_URL` in the shell, these scripts use `server/.env`, so check that the output says `REMOTE`:

```bash
DATABASE_URL="<neon-connection-string>" npm run reset:admin -w server
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

Optional: `UPLOAD_DIR`, `MAX_UPLOAD_MB` (local-style uploads only apply when Blob token is not set; on Vercel prefer Blob). The default limit is 4 MB, because Vercel rejects request bodies over about 4.5 MB.

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
| `NEXT_PUBLIC_SITE_URL` | The public address, e.g. `https://your-domain.example`, used for canonical links, language links and the sitemap. Without it the site uses the Vercel production address |

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

## Importing the site content

Pages, pictures and galleries come from `server/content/`, plus the original files in `server/content/raw/`, which are not in git. Run this from a checkout that has them, after migrations and before merging code that depends on the content. It is safe to run again: pages that already exist are left alone unless you add `--overwrite`, which replaces edits made in the admin.

```bash
DATABASE_URL='<neon-connection-string>' BLOB_READ_WRITE_TOKEN='<blob-token>' npm run content:import -w server -- --remote
```

It's safe to run again: pages, services and settings that already exist stay as they are, so edits made in the admin survive. Menu items and gallery pictures deleted in the admin come back, and `--overwrite` replaces pages.

To apply a change to a few pages only, add `--overwrite --only=slug,slug`. It replaces those pages and leaves every other page, menu, gallery and setting alone. It does remove any admin edits on the pages it replaces.

To rebuild the raw files: `node server/scripts/content/crawl.js`, then `node server/scripts/content/fetchAssets.js`. Both wait 10 seconds between requests, as the old site's `robots.txt` asks, so they take about 2 hours.

## GitHub

Connect the repo in each Vercel project (**Import Git Repository**). No extra GitHub Actions are required for deploy; optional: add a workflow that only runs tests (existing [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Operational notes

- **Schema changes**: run `npm run migrate -w server` locally (or in CI) against Neon; there is no automatic migrate on Vercel deploy.
- **Uploads**: with `BLOB_READ_WRITE_TOKEN` set, uploads go to Vercel Blob and return public `https://…` URLs. Without it, the API expects a writable disk (not suitable for serverless).
- **Picture grids**: `client/next.config.js` names the one Blob store whose pictures Vercel may resize. If you replace the store, update `BLOB_HOST` there, or those grids go back to loading full-size files.
