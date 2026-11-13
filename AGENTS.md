## Learned User Preferences

- Prefer user-facing confirmations without technical details (e.g. “Request sent” instead of IDs or technical error info).
- Prefer black & white (monochrome), high-contrast Cursor/Vim UI.

## Learned Workspace Facts

- npm-workspaces monorepo: `server`, `client`, `admin`, `e2e`.
- Ports: server 5000; client 3000; admin 5173.
- Stacks: server Express 4 (CommonJS, JS) + PostgreSQL 16 via `pg`; client Next.js 16 Pages Router + React 18 + TypeScript; admin Vite 6 + React 18 + react-router-dom 6 + TypeScript; e2e Playwright.
- Commands: `npm install` (root); dev/test per workspace; migrate/seed/reset content/reset admin in `server`.
- Locales: the public site serves `hy` (default), `en`, `ru`. Content also stores `ar` (Arabic, right to left), edited in the admin but not served yet; the admin's own interface has no `ar`. Multilingual DB fields use `*_ru/_en/_hy/_ar`, from `LANGS` in `server/src/services/localization.js` and `admin/src/contentSchemas/types.ts`. Client translations in `client/public/locales/{ru,en,hy}/common.json` via `next-i18next`; `ar/common.json` is drafted but not loaded.
- API responses: `{ ok: true, ...data }` or `{ ok: false, error: { message, details? } }`; shared `ApiResponse<T>` in `client/lib/api.ts` and `admin/src/api.ts`.
- Content blocks: `content_blocks` keyed by `(page_name, section_name)`; schemas live in `server/src/contentSchemas/` and the admin builds its forms from `GET /api/admin/schemas`.
- Public pages: every page is data in `pages` plus `content_blocks` sections, rendered by `client/pages/[...slug].tsx`; the content came from climatecentr.ru through `server/scripts/content/` (`npm run content:import -w server`).
- Code style: TypeScript for new files in `client`, `admin`, `e2e`; `server` stays CommonJS JavaScript; prefer React functional components; use snake_case for database columns.
- Architecture: new server resources and shared logic use service and repository layers (`server/src/services/`, `server/src/repositories/`); existing routes keep inline SQL unless a refactor is requested.
- If admin content is empty and seeding doesn’t overwrite (seed uses `ON CONFLICT ... DO NOTHING`), run `npm run migrate -w server` then `npm run reset:content -w server`.