# Portal Program Status and Handoff Log — 2026-07-12

## Purpose

Record what was implemented in `D:\gmim-system`, what was verified, and which master-plan release gates remain open. This log is the project-local handoff record; the unchecked boxes in the original master plan are not a reliable live status board.

## Completed Work

### P00–P02: repository, build, session and authorization foundation

- Removed tracked production connection material from the current tree and moved scripts to environment-based configuration.
- Added the Vitest harness and enforced lint, TypeScript and production-build quality gates.
- Removed schema mutation from the application build; migration deployment is an explicit command.
- Added password hashing, server-side HttpOnly sessions, centralized role checks and department isolation.
- Migrated API surfaces to session-derived authorization and added negative authorization tests.

Representative commits:

- `1bfc14d` — remove tracked production secrets
- `42e10de` — add baseline Vitest harness
- `aa00d83` — enforce TypeScript validation
- `285b979` — separate migrations from application build
- `a2a3e58` through `7925037` — password, session and API authorization rollout

### P03–P04: task, period and import hardening

- Made task approval/respond/delete flows transactional and conflict-aware.
- Added period-aware mutation guards and safer reset-period behavior.
- Added real CSV/XLSX parsing, preview, duplicate detection, import batches and rollback support.
- Kept runtime compatibility while the period/constraint/import migration remains a reviewed draft.

Representative commits:

- `c21fc2d` — harden task periods and imports
- `0660cf3` — keep runtime schema compatible with production
- `0370ed2` — finish P03/P04 hardening

### P05–P07: portal UI and feature slices

- Added the role-aware responsive AppShell, desktop navigation, mobile bottom navigation and department context.
- Rebuilt dashboard, tasks and points as route-based feature slices with TanStack Query and scoped APIs.
- Added responsive calendar/exam/program, announcements, people, approvals, categories, import and period-management routes.
- Reduced the former monolithic portal client and connected management actions to server authorization.

Representative commits:

- `8b39bae` — complete P05 AppShell foundation
- `ecfa242` — complete P06 dashboard, tasks and points
- `9c45d7a` — complete P07 portal workflows

### P08 partial hardening and follow-up portal UX

- Raised shared primary controls to the 44 × 44 px target and added loading status regions.
- Fixed the Axe findings observed on the main and management routes, including contrast and calendar ARIA issues.
- Updated Next.js to `16.2.10` and SheetJS to the official `0.20.3` package; removed unused direct `next-intl` and `uuid` dependencies.
- Required research assistants to provide a rejection reason before rejecting an assigned task.
- Exposed rejection reasons separately in task history and included them in manager notifications.
- Made actionable notifications navigate to tasks, announcements, exams or approvals.
- Reframed the misleading score rank as `current / total` assignment priority and explained that it is not a performance ranking.

Commit:

- `7f31b35` — harden portal accessibility and task workflows

## Last Verification

Before `7f31b35` was pushed to `origin/main`:

- `bun run test`: 31 test files, 150 tests passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run build`: passed with Next.js `16.2.10`; 43 routes/pages generated.
- `git diff --check`: passed.
- `origin/main` and local `main` both resolved to `7f31b35ff44d0960eb530cb498b287709adc3504`.
- No production database write or migration deployment was performed during the P08/UX work.

## Remaining Master-Plan Work

### P00 external security operations — not verified from the repository

- Confirm Neon production credential rotation and rejection of the former credential.
- Confirm the live application read-only health check with the replacement credential.
- Review Neon access/query logs for suspicious use.
- If still required, coordinate the backed-up Git-history cleanup with both developers and explicit repository-owner approval. Never force-push as part of normal development.

### Migration and production-data release gate

- Rehearse `prisma/migration-drafts/202607110002_periods_constraints_import_batches/migration.sql` against an anonymized staging backup.
- Verify backup and rollback commands before any production schema write.
- Convert the reviewed draft into the approved migration sequence and run `prisma migrate deploy` only with separate production-write approval.
- Verify the password-hash conversion on staging, then confirm aggregate production migration status without logging credentials or hashes.

### P08 release rehearsal

- Complete keyboard-only smoke testing for user, admin, `baskan` and `dekan`.
- Verify focus-visible, dialog focus trap/return and live-region behavior end to end.
- Capture a production Core Web Vitals baseline with the required Chrome DevTools tooling.
- Run full role E2E coverage for user/admin/`baskan`/`dekan`.
- Run visual regression at 320, 375, 390, 768, 1024 and 1440 px.
- Add/verify the login and AI rate-limit acceptance criteria.
- Continue tracking the remaining transitive `bun audit` findings; do not run blind `bun update --latest`.

## Recommended Next Work Order

1. Confirm P00 external credential status without changing production.
2. Prepare an anonymized staging database and backup/rollback procedure.
3. Rehearse the draft migration and password conversion on staging.
4. Complete the four-role keyboard/E2E and six-viewport visual suites.
5. Measure production Core Web Vitals and close the remaining release findings.
6. Request separate approval for any production migration, history rewrite, commit or push.

## Repository Safety Notes

- Keep `CLAUDE.md` and `AGENTS.md` identical.
- Pull `origin/main` immediately before every push and never use `--force`.
- Do not stage unrelated `.impeccable/`, `.superpowers/`, report, plan or spec files unless the user explicitly places them in scope.
- Database-writing scripts default to dry-run; require explicit commit/write approval.
- GMIM operations must not mutate DUIM data, and vice versa, except for explicitly authorized dean workflows.

## 2026-07-12 Closeout Update (working tree, not committed)

### Completed repository work

- Reproduced the production mobile overflow with real Fatih NACAR data at a 320 px Chrome viewport:
  - dashboard client width `305`, document width `404`, recent-task card width `388`;
  - tasks client width `305`, document width `344`, filter controls width `311`.
- Added shrink containment to the dashboard content grid, recent-task card and right column without using global overflow hiding.
- Added shrink containment to the task filter page, card, grid, search wrapper, all manager/user native selects and the action row.
- Changed the dashboard exam destination from the missing `/exams` page to `/calendar?domain=exams`; dean department query parameters remain preserved by `portalHref`.
- Added responsive source-contract regression tests for dashboard and task filters.
- Expanded authorization coverage to the complete 16-case `user/admin/baskan/dekan × stored department × requested department` matrix.
- Expanded navigation and dean query-string coverage for GMIM and DUIM.
- Removed tracked literal account passwords from `seed-production.ts`, `seed-migrate.ts` and `setup-passwords.ts`.
- Added a shared environment-driven seed-password helper that requires at least 12 characters and stores only Argon2 password hashes.
- Removed unused direct dependencies `@mdxeditor/editor`, `react-syntax-highlighter`, `@reactuses/core`, `next-auth` and `recharts`, plus the unused chart wrapper.
- Added `docs/superpowers/logs/2026-07-12-dependency-audit.md` with direct/transitive and runtime/dev-only classification.
- Added `docs/superpowers/specs/2026-07-12-rate-limit-release-contract.md` with the required 429/`Retry-After` acceptance behavior.

### Current verification

- `bun run test`: 34 files, 167 tests passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run build`: passed with Next.js `16.2.10`; 43 routes/pages generated.
- `git diff --check`: passed.
- No production database write, migration deployment, role change, commit or push was performed.

### Remaining external/release gates

1. Commit/push remains approval-gated. Pull `origin/main` again immediately before an approved push.
2. After deployment, repeat the six-viewport Chrome measurements against the new production bundle.
3. Live role smoke tests still require sequential signed-in sessions for GMIM admin/chairman, DUIM admin/chairman and dean. The current Chrome profile only exposes the Fatih NACAR `user/GMIM` session; unavailable roles are not marked passed.
4. Login/AI rate limiting is blocked on an approved shared durable store. Do not ship an in-memory Vercel limiter.
5. Production seed/password credentials found in Git history must be treated as exposed and rotated externally; current-tree cleanup cannot revoke them.
6. Neon credential rotation, rejection of the old credential and log review remain externally unverified.
7. The period/constraints/import migration still requires an anonymized staging database, backup/rollback commands and separate production-write approval.
8. Core Web Vitals remains blocked because the required Chrome DevTools MCP is not configured and the user requested no new browser-tool installation.
