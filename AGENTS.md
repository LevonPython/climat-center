## Learned User Preferences

- Prefer user-facing confirmations without technical details (e.g. “Request sent” instead of IDs or technical error info).
- Prefer black & white (monochrome), high-contrast Cursor/Vim UI.

## Learned Workspace Facts

- npm-workspaces monorepo: `server`, `client`, `admin`, `e2e`.
- Ports: server 5000; client 3000; admin 5173.
- Stacks: server Express 4 (CommonJS, JS) + PostgreSQL 16 via `pg`; client Next.js 16 Pages Router + React 18 + TypeScript; admin Vite 6 + React 18 + react-router-dom 6 + TypeScript; e2e Playwright.
- Commands: `npm install` (root); dev/test per workspace; migrate/seed/reset content in `server`.
- Locales: `am` (default), `en`, `ru`; multilingual DB fields use `*_ru/_en/_am`; client translations in `client/public/locales/{ru,en,am}/common.json` via `next-i18next`.
- API responses: `{ ok: true, ...data }` or `{ ok: false, error: { message, details? } }`; shared `ApiResponse<T>` in `client/lib/api.ts` and `admin/src/api.ts`.
- Content blocks: `content_blocks` keyed by `(page_name, section_name)`; schemas must stay in sync between `server/src/contentSchemas/` (JS) and `admin/src/contentSchemas/` (TS).
- Code style: TypeScript for all new files; prefer React functional components; use snake_case for database columns.
- Architecture: follow the repository pattern; keep business logic in service layers.
- If admin content is empty and seeding doesn’t overwrite (seed uses `ON CONFLICT ... DO NOTHING`), run `npm run migrate -w server` then `npm run reset:content -w server`.