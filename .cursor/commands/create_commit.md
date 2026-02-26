# Create Commit

## Overview
Create a well-structured git commit for the current changes. Always use the GitHub CLI and git commands.

## Steps
1. **Review changes**
   - Run `git status` to see all modified, added, and untracked files
   - Run `git diff` to review the actual changes
   - Identify which workspaces are affected (`server`, `client`, `admin`, `e2e`)

2. **Verify before committing**
   - Ensure no secrets or `.env` files are staged
   - Check that linter passes on changed files
   - Confirm changes are coherent (a single logical unit of work)

3. **Stage files**
   - Stage all relevant files with `git add`
   - Do NOT stage generated files, secrets, or unrelated changes

4. **Write commit message**
   - Check recent commit style: `git log --oneline -5`
   - Use conventional commit format with a HEREDOC:
     ```
     git commit -m "$(cat <<'EOF'
     <type>: <concise summary in imperative mood, max 72 chars>

     <body explaining what changed and why>

     Workspaces: <server|client|admin — list affected>
     EOF
     )"
     ```
   - Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`

5. **Verify**
   - Run `git status` to confirm the commit succeeded
   - Run `git log -1` to display the new commit
