## Deployment (VPS + Nginx + PM2)

This repo contains a basic production setup for:

- `server` (Express API) on port `5000`
- `client` (Next.js) on port `3000`
- `admin` (Vite build) served as static files by Nginx at `/admin/`

### 1) Build artifacts

- API: no build step (plain Node). Ensure `server/node_modules` installed.
- Public site:
  - `cd client && npm install && npm run build`
- Admin:
  - `cd admin && npm install && npm run build`

### 2) Run Node processes with PM2

Use `[deploy/pm2/ecosystem.config.cjs](pm2/ecosystem.config.cjs)`:

- `pm2 start deploy/pm2/ecosystem.config.cjs`
- `pm2 save`

### 3) Configure Nginx

Use `[deploy/nginx/site.conf](nginx/site.conf)` as a base:

- Proxy `/api` → `http://127.0.0.1:5000`
- Proxy `/uploads` → `http://127.0.0.1:5000/uploads`
- Proxy `/` → `http://127.0.0.1:3000`
- Serve `/admin/` from `admin/dist`

### 4) SSL

Use Certbot:

- `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`

