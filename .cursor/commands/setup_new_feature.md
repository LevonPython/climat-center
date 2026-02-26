# Setup New Feature

## Overview
Systematically plan and scaffold a new feature across the relevant workspaces in this monorepo.

## Steps
1. **Define requirements**
   - Clarify feature scope, goals, and affected workspaces (`server`, `client`, `admin`)
   - Identify user stories and acceptance criteria
   - Plan technical approach and data flow

2. **Create feature branch**
   - Branch from `main` with a descriptive name (e.g. `feature/feature-name`)
   - Install any new dependencies via `npm install <pkg> -w <workspace>`

3. **Plan architecture**
   - Design database schema changes (migrations in `server/`) — use `snake_case` columns, add `_ru`, `_en`, `_am` suffixes for multilingual fields
   - Plan API endpoints following the `{ ok, data }` / `{ ok, error }` response contract
   - Plan UI components for `client` (Next.js Pages Router) and/or `admin` (Vite + React Router)
   - If content-block based, define schemas in both `server/src/contentSchemas/` and `admin/src/contentSchemas/`

4. **Scaffold the feature**
   - Create migration file if DB changes are needed
   - Add server route, service, and repository layers
   - Add client/admin pages, components, and API calls
   - Add translation keys to all locales (`ru`, `en`, `am`)

## Feature Setup Checklist
- [ ] Requirements and scope documented
- [ ] Feature branch created
- [ ] Database migration planned/created (if needed)
- [ ] API endpoints designed
- [ ] UI components planned
- [ ] Translation keys identified for all three locales
- [ ] Content schemas in sync between server and admin (if applicable)
