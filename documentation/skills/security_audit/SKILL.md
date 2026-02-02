---
name: security-audit
description: A comprehensive security audit checklist and instructions for Next.js, Supabase, and TypeScript projects.
version: 1.0.0
author: Antigravity
permissions:
  - read_files
  - run_shell
---

# Security Audit Skill

This skill provides a systematic approach to auditing a Next.js + Supabase + TypeScript application for security vulnerabilities.

## 1. General Security Environment
- [ ] **Secrets Management**: Verify `.env` files are in `.gitignore`. Ensure `SUPABASE_SERVICE_ROLE_KEY` is NOT used in client-side code.
- [ ] **Dependencies**: Check for vulnerable dependencies using `npm audit`.
- [ ] **Git History**: Ensure no secrets have been committed to git history.

## 2. Supabase / Database Security
- [ ] **RLS Policies**: Ensure Row Level Security (RLS) is ENABLED on ALL tables.
- [ ] **Policy Review**: specific `auth.uid()` checks for user data. Avoid `current_setting('request.jwt.claim.sub', true)` if possible, prefer `auth.uid()`.
- [ ] **Public Access**: Verify `anon` key capabilities. It should strictly adhere to RLS.
- [ ] **Service Role**: Confirm `service_role` key is only used in secure server-side contexts (Edge Functions, Server Actions).

## 3. Next.js App Security
- [ ] **Server Actions**: Verify inputs to Server Actions are validated (e.g., using `zod`).
- [ ] **API Routes**: Check `route.ts` files for proper authentication checks (e.g., `supabase.auth.getUser()`).
- [ ] **Client Components**: Ensure no sensitive data is passed as props to Client Components (`"use client"`).
- [ ] **Headers**: Check for security headers in `next.config.ts` or middleware (CSP, X-Frame-Options, etc.).

## 4. Input Validation & Sanitization
- [ ] **Forms**: Ensure all form inputs are validated on the server.
- [ ] **SQL Injection**: Verify no raw SQL string concatenation is used. Use parameterized queries or ORM methods.

## 5. TypeScript Integrity
- [ ] **Strict Mode**: Ensure `"strict": true` in `tsconfig.json`.
- [ ] **No Any**: Scan for excessive use of `any` type, especially for external inputs.

## Execution Instructions
1.  Run `npm audit` in the project root.
2.  Search for "service_role" in the codebase to verify usage.
3.  Review `schema.sql` for `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
4.  Review `next.config.ts` for headers.
5.  Spot check API routes and Server Actions.
