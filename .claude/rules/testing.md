# Testing

| Check | Command |
|---|---|
| Server | `node .claude/scripts/test-server.js` |
| Client | `npm run test -w client` |
| Admin | `npm run test -w admin` |
| Typecheck | `npx tsc --noEmit --incremental false -p client`, same with `-p admin` |
| E2E | `npm run test -w e2e` (needs the running stack with imported content) |

No workspace has a lint or typecheck script. CI (`.github/workflows/ci.yml`) runs `npm test` with a Postgres service and does not run e2e.

## Server tests and the database
- Jest does not load `server/.env`. Without `DATABASE_URL` in the shell, the DB suites skip and the run still looks green, so a plain `npm run test -w server` proves little.
- With `DATABASE_URL` set, the suites **TRUNCATE** users, services, bookings, content and quiz data. Never point a test run at `climat_center` or Neon.
- `.claude/scripts/test-server.js` handles both: it uses a local `climat_center_test`, creates it if missing, and refuses anything else. Extra args go to Jest.

## E2E
- The specs need imported content: `npm run content:import -w server`.
- Set `E2E_ADMIN_PASSWORD` to run `admin-to-site.spec.ts`. `E2E_BASE_URL`, `E2E_API_URL` and `E2E_ADMIN_URL` point at other ports.
- They write requests and edit a page title, so point them at a throwaway database. Specs that write skip themselves when the site isn't on localhost.

## What to test
- Bug fix: write a failing regression test first, then fix.
- New endpoint: cover success, invalid input (400), no token (401) and wrong role (403).
- Assert behaviour, not implementation. In React tests prefer `getByRole` and `getByLabelText`.

## Existing patterns
- Server: supertest against `createApp()` with real Postgres and helpers from `server/tests/helpers/db.js`. Don't mock the database. A new table goes into `truncateAll`.
- Client: mock `next-i18next` and `next/router` as in `client/__tests__/BookingForm.test.tsx`. These mocks can't catch a wrong translation setup, which is why `client/__tests__/PageTranslations.test.tsx` uses the real library and `admin-to-site.spec.ts` checks edited text in a browser. Renamed translation keys must be updated in those mock maps.
- Admin: mock `../src/api` and render with `renderScreen` and `routeApi` from `admin/test/helpers.tsx`, as in `admin/__tests__/PagesPage.test.tsx`. Mock `RichTextEditor` with a textarea, because TipTap needs real browser layout.

## Before calling it done
- Search the suites for whatever you changed (component, route, class, translation key) and run the specs that come back. `grep -rn "<name>" server/tests client/__tests__ admin/__tests__ e2e/tests`
- A green suite means nothing broke, not that the result makes sense. When a component starts rendering somewhere new, open that screen and read it in its new context.
- Changing behaviour means updating the tests that covered it and saying why the old assertion no longer holds. Never delete or loosen a test just to get to green.
