---
name: create-issue
description: Create a well-structured GitHub issue that /task-pipeline can later implement.
disable-model-invocation: true
argument-hint: "[what the issue is about]"
allowed-tools:
  - Bash(gh label list *)
  - Bash(gh issue list *)
  - Bash(gh issue create *)
---

# Create issue

Request: $ARGUMENTS

## Steps

1. **Fill in what you can** from the request and conversation: title, what and why, acceptance criteria, affected workspaces, type. Ask only about what is genuinely missing.
2. **Check first.** Look for duplicates with `gh issue list --search "<keywords>" --state all`, and use only labels that exist in `gh label list`.
3. **Create it:**
   ```bash
   gh issue create --title "<title>" --label "<label>" --body "$(cat <<'MSG'
   ## Description
   What and why.

   ## Acceptance criteria
   - [ ] A specific, checkable outcome

   ## Affected workspaces
   server, client, admin (only the ones involved)

   ## Notes
   Migration, translation or content-block needs, if known.
   MSG
   )"
   ```

Report the issue number and URL. To implement it, the user can run `/task-pipeline <number>`.
