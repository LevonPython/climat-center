---
name: review-checklist
description: Review current changes against climat-center's own contracts (API response shape, route auth, three locales, schema sync, migration order, secrets). Use before a commit or PR, or when asked to check changes against project conventions. Complements /code-review, which looks for general bugs.
argument-hint: "[base branch or paths, default uncommitted changes]"
context: fork
background: false
disallowed-tools:
  - Edit
  - Write
  - NotebookEdit
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(node .claude/scripts/check-*)
---

# Project review

Review only; don't change any files. Scope requested: $ARGUMENTS

Working tree:

!`git status --short`

## Steps

1. Work out the scope. Use the requested scope if one was given. Otherwise use `git diff HEAD` plus untracked files. If the tree is clean, use `git diff main...HEAD`.
2. Read each changed file in full, not just its diff.
3. Run both mechanical checks:
   ```bash
   node .claude/scripts/check-schema-parity.js
   node .claude/scripts/check-locale-parity.js
   ```
4. Go through the checklist. Report only problems in the changed code. Existing issues elsewhere are not findings, and skip style opinions.

## Checklist

**API (`server`)**
- Responses are `{ ok: true, ...data }` or `{ ok: false, error: { message, details? } }`.
- Every new route has `verifyToken` and a role guard, or is an intentional public route that the change explains.
- Input is validated with `express-validator`, and `validationResult` is checked first.
- SQL is parameterized. Async handlers use try/catch into `next(err)`.
- Errors meant for the client set a 4xx status, or they become a generic 500. `password_hash` never leaves the login query.
- `server` code stays CommonJS JavaScript.
- Writes that change public pages call `triggerRevalidate`.

**Database**
- Migration is new (no applied file edited), numbered next, has no `BEGIN` or `COMMIT`, and follows `.claude/rules/database.md`.
- It is safe for old code to run against the new schema. If not, the sequence is called out.
- A new table is in `truncateAll`.

**Multilingual**
- New DB fields have `_ru`, `_en` and `_am` variants.
- No hardcoded user-facing text in `client` or `admin`.
- New UI text is non-technical, and `am` holds real Armenian.

**Content blocks**
- Both registries changed together.
- A removed or renamed field has a data migration.
- Pages fall back to `t()`.

**Client and admin**
- New ISR pages are in `pathsForEvent`.
- `serverSideTranslations` gets `nextI18nextConfig`. Props contain no `undefined`.
- Admin mutations throw on `!resp.ok` and invalidate their query.
- Tailwind classes are full names, in scanned directories, and new UI is responsive and accessible.

**Tests and safety**
- New behaviour has tests, and a bug fix has a regression test.
- Tests covering the changed behaviour were updated, not deleted or loosened.
- No secrets, `.env` files or production URLs in the diff. New env vars are in `.env.example`.
- No AI attribution anywhere.

## Report

List findings most severe first, each with `file:line`, the rule broken, what goes wrong, and the fix. If there are none, say so plainly. Always list anything you could not verify, including UI you did not view.
