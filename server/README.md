## Server (Express + PostgreSQL)

### Prerequisites

- Node.js LTS
- PostgreSQL

### Setup

1. Copy env:
   - `server/.env.example` → `server/.env`
2. Install deps:
   - `npm install`
3. Run migrations + seed:
   - `npm run migrate -w server`
   - `npm run seed -w server`
4. Start API:
   - `npm run dev -w server`

API health: `GET /api/health`

