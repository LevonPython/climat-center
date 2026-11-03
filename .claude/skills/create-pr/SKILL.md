---
name: create-pr
description: Push the current branch and open a pull request with the project's description format.
disable-model-invocation: true
argument-hint: "[issue number or notes]"
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(git fetch *)
  - Bash(git push -u origin *)
  - Bash(gh pr view *)
  - Bash(gh pr create *)
  - Bash(node .claude/scripts/*)
  - Bash(npx tsc *)
  - Bash(npm run test *)
---

# Create pull request

Notes from the user: $ARGUMENTS

- Branch: !`git branch --show-current`
- Uncommitted:
!`git status --short`
- Commits on this branch:
!`git log --oneline main..HEAD`
- Changes:
!`git diff --stat main...HEAD`

## Steps

1. **Pre-flight.** Stop and say why if you are on `main`, there is uncommitted work (suggest `/create-commit`), or there are no commits ahead of `main`.
2. **Up to date.** Run `git fetch origin main` and `git log --oneline HEAD..origin/main`. If `main` has moved, ask before rebasing.
3. **Checks.** Run the checks from `.claude/rules/testing.md` for each changed workspace. Report failures rather than opening the PR over them.
4. **Project review.** Use the `review-checklist` skill against `main`, and resolve or report its findings.
5. **Push and open:**
   ```bash
   git push -u origin HEAD
   gh pr create --title "type(scope): summary" --body "$(cat <<'MSG'
   ## Summary
   What changed and why.

   ## Workspaces
   server, client, admin (only the ones touched)

   ## Migration
   None. Or: the file, whether it's safe for old code, and "apply to Neon before merging".

   ## Environment
   None. Or: new variables to set in Vercel before merging.

   ## UI
   Screens to look at, including Armenian at 360px. Omit if no UI changed.

   ## Test plan
   - [x] What was run, with results
   - [ ] What still needs a person

   Closes #N
   MSG
   )"
   ```
   Remove the `Closes` line without a linked issue. No AI attribution lines.

Report the PR URL and anything that must happen before it merges.
