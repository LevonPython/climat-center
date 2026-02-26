# Code Review Checklist

## Overview
Conduct a thorough code review of the current changes across the monorepo (`server`, `client`, `admin`, `e2e`) to ensure quality, security, and maintainability.

## Steps
1. **Identify changed files** — use `git diff` to understand the scope of changes across workspaces
2. **Review each workspace** — check changes in context of that workspace's stack (Express/JS for server, Next.js/TS for client, Vite/React/TS for admin)
3. **Report findings** — list issues grouped by category below

## Review Categories

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled (empty arrays, null values, missing translations)
- [ ] Error handling follows `{ ok, error: { message, details? } }` API contract
- [ ] No obvious bugs or logic errors

### Code Quality
- [ ] Code is readable and well-structured
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] No code duplication across or within workspaces
- [ ] Follows project conventions (snake_case DB columns, TypeScript for new files, functional React components)

### Multilingual / i18n
- [ ] All three locale suffixes (`_ru`, `_en`, `_am`) are handled for DB fields
- [ ] Translation keys added to all `client/public/locales/{ru,en,am}/common.json` files
- [ ] No hardcoded user-facing strings

### Security
- [ ] No obvious security vulnerabilities (SQL injection, XSS)
- [ ] Input validation is present on server endpoints
- [ ] Sensitive data is not exposed in API responses
- [ ] No hardcoded secrets or credentials

### Content Schemas
- [ ] If content schemas changed, both `server/src/contentSchemas/` and `admin/src/contentSchemas/` are in sync
