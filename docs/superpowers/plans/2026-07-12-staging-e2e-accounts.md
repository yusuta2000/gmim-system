# Staging E2E Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reusable staging deployment and seven role/department test accounts without touching production data.

**Architecture:** Generate credentials and reset SQL locally, create an isolated Neon branch, apply the reset only there, connect a separate Vercel project, then verify every role in Chrome.

**Tech Stack:** Bun, Argon2, Prisma/PostgreSQL, Neon, Vercel, Chrome.

## Global Constraints

- Never print or commit generated passwords, hashes or connection strings.
- Never apply reset SQL to the production branch.
- Default every local account command to dry-run.
- Keep production and staging Vercel environment variables separate.

### Task 1: Generate the role manifest

- [x] Add `scripts/manage-e2e-accounts.ts` with seven fixed role identities.
- [x] Default invocation prints only the planned IDs, roles and departments.
- [x] `--generate` writes ignored `local-e2e-credentials.json` and `local-e2e-reset.sql` with mode `0600` where supported.
- [x] Refuse overwrite unless `--force` is supplied.
- [x] Test manifest safety and file-ignore behavior.

### Task 2: Create and sanitize Neon staging

- [x] Create the schema-only `e2e-staging` branch in Neon Console.
- [x] Confirm the selected branch name before opening SQL Editor.
- [x] Apply `local-e2e-reset.sql` only to `e2e-staging`.
- [x] Query role/department rows and confirm seven accounts.

### Task 3: Create the Vercel staging project

- [x] Import the existing GitHub repository as `itudfportal-staging`.
- [x] Configure `DATABASE_URL` and `DIRECT_URL` from the Neon staging branch only.
- [x] Leave the optional AI key unset because AI testing was not required.
- [x] Deploy and record the staging URL without recording secrets.

### Task 4: Verify and document

- [x] Update the local credential file with the staging URL.
- [x] Log in sequentially with all seven accounts in Chrome.
- [x] Run role, department and six-viewport checks; keyboard-only depth remains a P08 release gate.
- [x] Write results to `docs/testing/STAGING_E2E.md` and the program handoff.
- [x] Commit/push only non-secret scripts and documentation.
