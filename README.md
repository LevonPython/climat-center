# climat-center

Monorepo for a multi-language climate service website (public site + admin panel) with a Node.js (Express) + PostgreSQL backend.

## Apps

- `server/`: Express API + PostgreSQL
- `client/`: Public website (Next.js)
- `admin/`: Admin panel (Vite + React)

## Local development (after installing Node.js)

- Install deps (repo root):
  - `npm install`
- Run apps in separate terminals:
  - API: `npm run dev -w server`
  - Public site: `npm run dev -w client`
  - Admin panel: `npm run dev -w admin`

## Environment

Copy examples and fill values:

- `server/.env.example` → `server/.env`
