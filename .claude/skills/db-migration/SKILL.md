---
name: db-migration
description: Write, test and apply a PostgreSQL schema migration, including the production order for Neon. Use when a change needs a new table, column, index or constraint, or when asked to apply migrations.
---

# Database migrations

Existing migrations:

!`ls server/migrations`

## 1. Write it

Create `server/migrations/NNN_description.sql` with the next number. Keep to the conventions in `.claude/rules/database.md`. No `BEGIN` or `COMMIT`, because `migrate.js` wraps the batch.

```sql
-- 004_add_bookings_source.sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
```

New table checklist: UUID primary key, `TIMESTAMPTZ` timestamps, `set_updated_at()` trigger if mutable, `CHECK` for enums, explicit `ON DELETE`, indexes on foreign keys, and an entry in `truncateAll` in `server/tests/helpers/db.js`.

## 2. Make it safe to deploy

Vercel deploys don't migrate, so old code will run against the new schema for a while, and new code must never run against the old one.

| Change | Safe sequence |
|---|---|
| New table or nullable column | One migration, applied before merge |
| New `NOT NULL` column | Add nullable or with a default, backfill, then add the constraint |
| Rename | Add the new column and copy data, deploy code using it, drop the old column later |
| Drop | Deploy code that no longer uses it, then drop |

Applied migrations are never edited. To undo one, write a new migration that reverses it.

## 3. Test it

```bash
node .claude/scripts/test-server.js
npm run migrate -w server
```

The test runner applies migrations to `climat_center_test`, and the second command applies them to the local dev database. Both must succeed. Run `npm run seed -w server` too if the seed touches the changed tables.

## 4. Production (only when the user asks)

Apply to Neon **before merging** the code that needs it.

1. Confirm with the user that this migration should go to production now, and show them the SQL.
2. Have the user supply the connection string. Never write it to a file, commit or log.
   ```bash
   DATABASE_URL="<neon-connection-string>" npm run migrate -w server
   ```
3. Report which migrations were applied, from the command's output. The PR can merge after this.
