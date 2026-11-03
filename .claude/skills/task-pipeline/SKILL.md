---
name: task-pipeline
description: Take a GitHub issue or task description from research through implementation and verification, ending ready to commit.
disable-model-invocation: true
argument-hint: "[issue-number or task description]"
---

# Task pipeline

Task: $ARGUMENTS

Run these phases in order, in this session. Stop and report if a phase ends unclear or blocked rather than pushing on.

## 0. Understand

- If the task is an issue number, fetch it: `gh issue view <n> --json number,title,body,labels`. Remember the number for the commit.
- Work out the type of work and which workspaces are affected.
- If requirements are vague or lack acceptance criteria, ask before starting. Don't guess.

## 1. Research and plan

- Trace the data flow end to end: DB, server route, API response, client or admin UI.
- Find the closest existing feature and reuse its patterns and helpers.
- Decide: files per workspace, migration needed, endpoint shape, new translation keys, content blocks.
- For a large or ambiguous change, share the plan and wait for the user.

## 2. Implement

Follow `.claude/rules/`, and use the matching skill for each part:
- Schema change: `db-migration`
- Editable page content: `content-block`
- UI text: `i18n-sync`

For a bug, write the failing regression test first. For an endpoint, cover 200, 400, 401 and 403. New server resources use service and repository layers; edits to existing routes match the file.

## 3. Verify

1. Search the suites for whatever you changed, and update the tests that cover it.
2. Run the checks from `.claude/rules/testing.md` for each affected workspace, plus the parity scripts when relevant.
3. Use the `review-checklist` skill and fix what it finds.
4. For UI changes, use the `dev-stack` skill and look at the screen, in Armenian at 360px as well as desktop.

Limit: 3 fix cycles on the same failure, then stop and report.

**Content failures:** if something fails because content is missing (Content page empty, `GET /api/content/blocks` returns 0 blocks, or blocks hold `{}`), use the `db-content-reset` skill once, on a local database only, and retry once. If it still fails, stop and report.

## 4. Stop ready to commit

Don't commit or push. Report:

- **Task:** issue number and title, or the description.
- **Changes:** files per workspace, and decisions worth reviewing.
- **Verification:** test results per workspace, review findings, what you looked at in the UI, and what you could not check.
- **Migration:** none, or what must reach Neon before merging.
- **Proposed commit message**, with `Closes #N` if linked.
- **Next:** `/create-commit`, then `/create-pr`.
