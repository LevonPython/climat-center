# Create PR

## Overview
Create a well-structured pull request using the GitHub CLI with a proper description and linked context.

## Steps
1. **Prepare branch**
   - Ensure all changes are committed
   - Push branch to remote
   - Verify branch is up to date with `main`

2. **Write PR description**
   - Summarize changes clearly, noting which workspaces are affected (`server`, `client`, `admin`)
   - Include context and motivation
   - List any breaking changes or migration steps
   - Add screenshots if UI changes are involved

3. **Create PR via GitHub CLI**
   - Use `gh pr create` with a descriptive title
   - Link related issues if applicable

## PR Checklist
- [ ] All changes committed and pushed
- [ ] Branch is up to date with `main`
- [ ] PR title is descriptive
- [ ] PR description explains the what and why
- [ ] Breaking changes documented
- [ ] Content schemas in sync (if changed)
- [ ] Translation keys present in all locales (if applicable)
