---
paths:
  - "server/src/**/*.js"
  - "server/api/**/*.js"
---

# Server / Express API

Plain JavaScript with CommonJS. No TypeScript or ESM in this workspace.

## Layering
- Existing routes keep inline SQL. Small edits match the file you are in; don't refactor unless asked.
- New resources, and logic shared by more than one route, use layers. Neither directory exists yet; the first feature that needs them creates them.
  - Route (`server/src/routes/`): validation, auth, status codes, response shape.
  - Service (`server/src/services/fooService.js`): business rules, no `req` or `res`.
  - Repository (`server/src/repositories/fooRepository.js`): SQL only, with an optional client argument so it can join a transaction.

## Route shape
Export a named router (`{ fooRouter }`) and mount it under `/api/` in `server/src/app.js`.

```js
fooRouter.post(
  '/',
  verifyToken,
  requireAnyRole(['admin', 'editor']),
  body('title').isString().trim().notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ ok: false, error: { message: 'Invalid payload', details: errors.array() } });
      }
      const result = await query('INSERT INTO foo (title) VALUES ($1) RETURNING id, title', [req.body.title]);
      return res.status(201).json({ ok: true, foo: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);
```

- Express 4 does not catch async rejections. Every async handler needs try/catch into `next(err)`.
- Responses are always `{ ok: true, ...data }` or `{ ok: false, error: { message, details? } }`.

## Auth
- Deny by default: every route needs `verifyToken` plus `requireRole` or `requireAnyRole`.
- The intentional public routes are health, `POST /api/auth/login`, `GET /api/services`, `GET /api/content/:lang`, `POST /api/bookings` and `POST /api/quiz-submissions`. Adding to this list is a decision to flag.
- No rate limiting exists yet, so raise it when adding a public write endpoint.
- Select explicit columns from `users`. `password_hash` is only read by login and never returned.

## Errors
- `errorHandler` sends a non-Postgres `err.message` to the client as-is, so only throw client-safe text.
- Don't pre-check uniqueness or references. Let Postgres errors `23505` and `23503` bubble; the handler maps them to 409 and 400.

## Data access
- `{ query, withClient }` from `server/src/config/db.js`. Parameterized `$N` only, never concatenated input.
- Transactions: `withClient` with `BEGIN`, `COMMIT`, `ROLLBACK`, as in `server/src/routes/content.js`.
- List endpoints validate `limit` (maximum 200) and `offset`, as in `server/src/routes/bookings.js`.

## Runtime
- After writes that change public pages, call `triggerRevalidate('content')` or `triggerRevalidate('services')`, fire-and-forget. A new event must be added to `server/src/config/revalidateClient.js` and `client/pages/api/revalidate.ts`.
- Production runs on Vercel through `server/api/index.js`. The filesystem is not persistent and there is no long-lived state; uploads go to Vercel Blob.
- Secrets come from env only. A new variable goes in `server/.env.example` and `deploy/vercel.md`.
