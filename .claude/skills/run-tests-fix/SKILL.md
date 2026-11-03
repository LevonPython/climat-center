---
name: run-tests-fix
description: Run every test suite and the typecheck across workspaces, then fix the failures.
disable-model-invocation: true
argument-hint: "[workspace, default all]"
allowed-tools:
  - Bash(node .claude/scripts/*)
  - Bash(npm run test *)
  - Bash(npx tsc *)
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
---

# Run tests and fix failures

Scope: $ARGUMENTS (if blank, everything)

## 1. Run

```bash
node .claude/scripts/test-server.js
npm run test -w client
npm run test -w admin
npx tsc --noEmit --incremental false -p client
npx tsc --noEmit --incremental false -p admin
```

Always use the runner for the server. A plain `npm run test -w server` skips the DB suites, and setting `DATABASE_URL` yourself risks wiping real data.

Run e2e only if asked. It needs the running stack (see the `dev-stack` skill) and isn't part of CI.

## 2. Triage

For each failure, read the test and the code and decide what is wrong:
- **Code is wrong:** fix the code.
- **Test is out of date** because behaviour intentionally changed: update it, and say why the old assertion no longer holds.
- **Flaky:** re-run once. If it passes, report it as flaky rather than hiding it.
- **Environment:** Postgres down or missing dependencies. Fix the setup or report it; don't change code to compensate.

Never delete, skip or loosen a test just to get to green.

## 3. Fix

Fix one cause at a time and re-run the affected workspace after each. Stop after 3 fix cycles on the same failure and report what you found.

`climat_center_test` is disposable. If its schema is broken, it can be dropped and the runner will recreate it. Never touch `climat_center` or Neon for this.

## 4. Report

Finish with one full run of everything and report per workspace: passed, failed and skipped. Server should show 0 skipped. List what you fixed, and call out any failure that predates the current changes.
