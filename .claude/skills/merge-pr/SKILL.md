---
name: merge-pr
description: Merge an open pull request after checking CI, review state and migration order, then clean up the branch.
disable-model-invocation: true
argument-hint: "[pr-number, default current branch]"
allowed-tools:
  - Bash(gh pr view *)
  - Bash(gh pr checks *)
  - Bash(gh pr diff *)
  - Bash(git status *)
  - Bash(git switch main)
  - Bash(git pull --ff-only)
---

# Merge pull request

PR: $ARGUMENTS (if blank, use the current branch's PR)

## 1. Gates

```bash
gh pr view <n> --json number,title,state,isDraft,reviewDecision,mergeable,mergeStateStatus,baseRefName,headRefName,files
gh pr checks <n>
```

Stop and report if any of these is true:
- It isn't open, is a draft, or doesn't target `main`.
- `reviewDecision` is `CHANGES_REQUESTED`.
- It has conflicts, or `mergeStateStatus` blocks merging.
- A check failed or is still running.

## 2. Production order

Deploys don't migrate, and merging ships to Vercel straight away.

- **The PR adds a file in `server/migrations/`:** ask the user whether it has been applied to Neon. If not, stop; the `db-migration` skill has the steps. Don't assume, and don't merge on a guess.
- **The PR adds a variable to any `.env.example`:** ask whether it's set in Vercel.

## 3. Merge

Project history uses merge commits.

```bash
gh pr merge <n> --merge --delete-branch
```

Never use `--admin` or anything else that bypasses a failed gate. If the merge is refused, report why.

## 4. Confirm

```bash
gh pr view <n> --json state,mergeCommit
git switch main
git pull --ff-only
```

If the working tree has uncommitted changes, leave them alone and skip switching branches. Report the merge commit, and remind the user of anything needed after deploy.
