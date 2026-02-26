# Security Audit

## Overview
Comprehensive security review of the monorepo to identify and fix vulnerabilities across `server`, `client`, and `admin` workspaces.

## Steps
1. **Dependency audit**
   - Run `npm audit` at the root to check all workspaces
   - Check for known vulnerabilities and update outdated packages
   - Review third-party dependencies for each workspace

2. **Server security review**
   - Audit Express routes for SQL injection (raw `pg` queries)
   - Review authentication and authorization middleware
   - Check that all endpoints validate input
   - Ensure API responses don't leak sensitive data
   - Verify environment variables are not hardcoded

3. **Client & Admin security review**
   - Check for XSS vulnerabilities in rendered content
   - Review API call patterns in `client/lib/api.ts` and `admin/src/api.ts`
   - Ensure no secrets are exposed in client-side bundles
   - Verify CORS and CSP configuration

4. **Infrastructure security**
   - Review `.env` files and environment variable usage
   - Check PostgreSQL connection security
   - Audit file upload handling if present

## Security Checklist
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] No hardcoded secrets in source code
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] Input validation on all server endpoints
- [ ] Authentication middleware applied to protected routes
- [ ] Authorization checks enforce proper access control
- [ ] CORS configured correctly
- [ ] Sensitive data excluded from API responses
