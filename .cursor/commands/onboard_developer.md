# Onboard New Developer

## Overview
Guide a new developer through setting up and understanding this monorepo so they can start contributing quickly.

## Steps
1. **Environment setup**
   - Ensure Node.js and npm are installed
   - Run `npm install` at the repo root to install all workspace dependencies
   - Set up PostgreSQL 16 and create the local database
   - Copy `.env.example` to `.env` and configure environment variables
   - Run `npm run migrate -w server` to apply database migrations
   - Run `npm run seed -w server` to populate seed data

2. **Verify everything works**
   - Start the server: `npm run dev -w server` (port 5000)
   - Start the client: `npm run dev -w client` (port 3000)
   - Start the admin panel: `npm run dev -w admin` (port 5173)
   - Run tests: `npm run test -w server`, `npm run test -w client`, `npm run test -w admin`

3. **Project familiarization**
   - Explain the monorepo structure: `server` (Express/JS), `client` (Next.js/TS), `admin` (Vite+React/TS), `e2e` (Playwright)
   - Explain the multilingual setup: three locales (`ru`, `en`, `am`), DB suffixes `_ru/_en/_am`, client translations in `client/public/locales/`
   - Explain the API response contract: `{ ok: true, ...data }` or `{ ok: false, error: { message, details? } }`
   - Explain content blocks: `content_blocks` table keyed by `(page_name, section_name)`, schemas in both `server/src/contentSchemas/` and `admin/src/contentSchemas/`

## Onboarding Checklist
- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] PostgreSQL set up with local database
- [ ] Environment variables configured
- [ ] Migrations and seeds applied
- [ ] Server, client, and admin all run locally
- [ ] All tests passing
- [ ] Understands monorepo structure and conventions
