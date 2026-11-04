---
name: create-commit
description: Commit the current changes following project conventions, with checks first.
disable-model-invocation: true
argument-hint: "[issue number or message hint]"
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git branch *)
  - Bash(git switch *)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(node .claude/scripts/*)
  - Bash(npx tsc *)
  - Bash(npm run test *)
---

# Create commit

Hint from the user: $ARGUMENTS

- Branch: !`git branch --show-current`
- Status:
!`git status --short`
- Size:
!`git diff --stat HEAD`
- Recent style:
!`git log --oneline -5`

## Steps

1. **Read the diff** with `git diff HEAD`. If nothing changed, stop and say so. If the changes hold unrelated work, ask how to split them.
2. **Branch.** If on `main`, create one first: `git switch -c <type>/<short-name>`.
3. **Check what changed:**

   | Changed | Run |
   |---|---|
   | `server/` | `node .claude/scripts/test-server.js` |
   | `client/` | `npm run test -w client` and `npx tsc --noEmit --incremental false -p client` |
   | `admin/` | `npm run test -w admin` and `npx tsc --noEmit --incremental false -p admin` |
   | `*/public/locales/` or new `t()` calls | `node .claude/scripts/check-locale-parity.js` |

   If a check fails, stop and report it. Don't commit around a failure unless the user says to.
4. **Stage explicit paths**, never `git add -A`. Leave out secrets, build output and unrelated files.
5. **Commit** with a HEREDOC:
   ```bash
   git commit -m "$(cat <<'MSG'
   type(scope): imperative summary, 72 characters at most

   Why this change was needed, if the subject doesn't already say.

   Closes #N
   MSG
   )"
   ```
   - Types and scopes are in `.claude/rules/working-style.md`.
   - Include `Closes #N` only with a linked issue. If several workspaces are touched, add a `Workspaces: server, client` line.
   - No AI attribution lines.
6. **Confirm** with `git status --short` and `git log -1 --stat`.

Report the hash and subject, which checks ran, and that nothing was pushed. Suggest `/create-pr` when the work is ready.
