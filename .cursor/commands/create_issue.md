# Create GitHub Issue

Create a well-structured GitHub issue using the GitHub CLI. The returned issue number can be passed to `/task_pipeline` to trigger the full implementation workflow.

## Steps

1. **Gather requirements from the user**
   - Ask for a clear title
   - Ask for a description covering: what, why, and acceptance criteria
   - Ask which workspaces are affected (`server`, `client`, `admin`)
   - Ask for labels (e.g. `feature`, `bug`, `refactor`, `chore`)

2. **Create the issue**
   ```
   gh issue create \
     --title "<title>" \
     --body "$(cat <<'EOF'
   ## Description
   <what and why>

   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2

   ## Affected Workspaces
   - [ ] server
   - [ ] client
   - [ ] admin

   ## Notes
   <any additional context>
   EOF
   )" \
     --label "<labels>"
   ```

3. **Report back**
   - Display the created issue number and URL
   - Tell the user they can now run `/task_pipeline` with this issue number to start implementation
