---
paths:
  - "server/migrations/**/*.sql"
  - "server/scripts/**/*.js"
  - "server/tests/helpers/**"
  - "server/src/config/db.js"
---

# Database

PostgreSQL 16 through `pg`. No ORM. For the full workflow use the `db-migration` skill.

## Migrations
- Plain SQL in `server/migrations/`, named `NNN_description.sql`, applied in filename order.
- Forward-only. `_migrations` tracks filenames, so never edit or rename an applied file. Fix mistakes with a new migration.
- **No `BEGIN` or `COMMIT` in the file.** `server/scripts/migrate.js` wraps all pending migrations in one transaction. `003_services_type_check.sql` has its own and ends that transaction early; don't copy it.
- `CREATE INDEX CONCURRENTLY` can't run inside that transaction, so don't use it.
- Prefer `IF NOT EXISTS` so a partly applied database can recover.

## Production order
Vercel deploys do **not** migrate (`deploy/vercel.md`). Merging code that reads a new column before the migration reaches Neon breaks production.
- Apply to Neon first, then merge. Additive, nullable changes are safe to apply early because old code ignores them.
- Rename or drop in steps: add the new shape, deploy code that uses it, remove the old shape in a later migration.
- A new `NOT NULL` column on an existing table needs a default or a backfill first.

## Schema conventions
- Tables: `snake_case` plural. Columns: `snake_case`.
- Primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- Timestamps: `TIMESTAMPTZ NOT NULL DEFAULT now()`. Mutable tables get `updated_at` and the `set_updated_at()` trigger from `001_init.sql`.
- Enums: `TEXT` with a `CHECK` constraint, not `CREATE TYPE`.
- Foreign keys: explicit `ON DELETE`, plus an index on the column. Index columns used in `WHERE` and `ORDER BY`.
- Multilingual text: three nullable columns, `title_ru`, `title_en`, `title_am`.
- Lifecycle: services soft-delete with `is_active`; bookings move through `status`.

## Seeds and tests
- Seeds are idempotent with `ON CONFLICT ... DO NOTHING`, so they never update existing rows. To reset content use the `db-content-reset` skill.
- `server/scripts/seed.js` only uses its default admin password on a local database. On a remote one it skips the admin unless `SEED_ADMIN_PASSWORD` is set. To replace a password use `npm run reset:admin -w server`.
- A new table goes into `truncateAll` in `server/tests/helpers/db.js`.
