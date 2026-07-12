# Portal Program Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every repository-actionable item in the 2026-07-12 handoff, verify responsive and role boundaries, and leave external production operations behind explicit release gates.

**Architecture:** Apply surgical component fixes first, then extend authorization/rate-limit tests, classify dependency and credential risks, and finish with local and Chrome release rehearsals. Production database writes, credential rotation, history rewriting, commit and push remain separate approval-gated operations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma/PostgreSQL, Vitest, Bun, Chrome.

## Global Constraints

- Never use global `overflow-x-hidden` to mask layout defects.
- Never log credentials, password hashes, session tokens or production connection strings.
- GMIM and DUIM data remain isolated except for the dean's explicitly tested faculty-wide view.
- Production mutations and `prisma migrate deploy` require separate approval.
- Run `git pull origin main` immediately before any approved push; never force-push.
- Run no Playwright, Chrome DevTools or dependency installation solely for browser verification.
- Commit and push only after explicit user approval.

---

### Task 1: Dashboard responsive containment and exam route

**Files:**
- Modify: `src/features/dashboard/components/dashboard-screen.tsx`
- Create: `src/features/dashboard/components/dashboard-responsive.test.ts`

**Interfaces:**
- Consumes: `portalHref(href, user, department)`.
- Produces: dashboard markup that can shrink below intrinsic content width and an exam target of `/calendar?domain=exams`.

- [ ] **Step 1: Write the failing source-contract test**

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/features/dashboard/components/dashboard-screen.tsx'), 'utf8')

describe('dashboard responsive contracts', () => {
  it('keeps grid children shrinkable on narrow screens', () => {
    expect(source).toContain('grid min-w-0 gap-6')
    expect(source).toContain('className="min-w-0 space-y-6"')
    expect(source).toContain('className="min-w-0 rounded-xl border border-border bg-surface"')
  })

  it('opens exams inside the calendar route', () => {
    expect(source).toContain("portalHref('/calendar?domain=exams', user, department)")
    expect(source).not.toContain("portalHref('/exams', user, department)")
  })
})
```

- [ ] **Step 2: Run `bun run test -- src/features/dashboard/components/dashboard-responsive.test.ts` and verify failure**

Expected: missing `min-w-0` and old `/exams` target assertions fail.

- [ ] **Step 3: Apply minimal dashboard classes and route**

Change the outer content grid to `grid min-w-0 gap-6 ...`, its right column to `min-w-0 space-y-6`, `RecentTasks` to `min-w-0 rounded-xl ...`, and use `portalHref('/calendar?domain=exams', user, department)`.

- [ ] **Step 4: Run the focused test and verify pass**

- [ ] **Step 5: Commit only after approval**

```bash
git add src/features/dashboard/components/dashboard-screen.tsx src/features/dashboard/components/dashboard-responsive.test.ts
git commit -m "fix(ui): contain dashboard content on mobile"
```

### Task 2: Task filter responsive containment

**Files:**
- Modify: `src/features/tasks/components/tasks-screen.tsx`
- Create: `src/features/tasks/components/tasks-responsive.test.ts`

**Interfaces:**
- Consumes: existing `TaskFilters` and manager-specific assistant filter.
- Produces: controls whose width is bounded by the filter card for user and manager roles.

- [ ] **Step 1: Write a failing source-contract test**

Assert that the filter section and form include `min-w-0`, the search wrapper includes `min-w-0`, all native selects include `w-full min-w-0`, and the action row includes `min-w-0`.

- [ ] **Step 2: Run the focused test and verify failure**

- [ ] **Step 3: Add only the containment classes**

Use `min-w-0` on the page wrapper, filter section, form and search wrapper; use `w-full min-w-0` on every native select and `min-w-0 w-full` on the action row. Preserve breakpoints and filter behavior.

- [ ] **Step 4: Run the focused test and verify pass**

- [ ] **Step 5: Commit only after approval**

```bash
git add src/features/tasks/components/tasks-screen.tsx src/features/tasks/components/tasks-responsive.test.ts
git commit -m "fix(ui): contain task filters on mobile"
```

### Task 3: Role and department regression matrix

**Files:**
- Modify: `src/lib/authorization/__tests__/matrix.test.ts`
- Modify: `src/components/navigation/nav-config.test.ts`
- Modify: `src/components/app-shell/portal-context.test.ts`

**Interfaces:**
- Consumes: `assertDepartmentAccess`, `getNavigationItems`, `departmentFromUrl`, `portalHref`.
- Produces: complete `user/admin/baskan/dekan × GMIM/DUIM` coverage.

- [ ] **Step 1: Expand the authorization table to all 16 role/department/requested-department combinations**

Each non-dean role must pass only its own department; the dean must pass both departments regardless of the account's stored department.

- [ ] **Step 2: Add navigation assertions for both stored departments**

Research assistants receive only work routes; admin, chairman and dean receive the same management routes.

- [ ] **Step 3: Add dean query-string assertions**

```ts
expect(portalHref('/calendar?domain=exams', user('dekan'), 'DUIM'))
  .toBe('/calendar?domain=exams&department=DUIM')
```

- [ ] **Step 4: Run the three focused test files and verify pass**

- [ ] **Step 5: Commit only after approval**

```bash
git add src/lib/authorization/__tests__/matrix.test.ts src/components/navigation/nav-config.test.ts src/components/app-shell/portal-context.test.ts
git commit -m "test(auth): complete role and department matrix"
```

### Task 4: Login and AI rate-limit release contract

**Files:**
- Create: `src/lib/rate-limit/types.ts`
- Create: `src/lib/rate-limit/rate-limit.test.ts`
- Create after storage decision: `src/lib/rate-limit/rate-limit.ts`
- Modify after storage decision: `src/app/api/login/route.ts`
- Modify after storage decision: `src/app/api/ai-classify/route.ts`
- Create: `docs/superpowers/specs/2026-07-12-rate-limit-release-contract.md`

**Interfaces:**
- Produces: `checkRateLimit(input): Promise<{ allowed: boolean; retryAfterSeconds: number }>`.

- [ ] **Step 1: Document acceptance behavior without inventing storage**

The contract must require 429 responses with `{ error: 'RATE_LIMITED', retryAfterSeconds }` plus `Retry-After`; login keys must not disclose whether an account exists; AI keys must be authenticated-user scoped.

- [ ] **Step 2: Record the infrastructure gate**

Do not ship an in-memory limiter on Vercel. Choose a shared durable store (approved PostgreSQL migration or an approved managed rate-limit service) before wiring routes.

- [ ] **Step 3: Implement and test only when the shared store is approved and available**

Tests cover allowance, exhaustion, retry time and window recovery. Route tests prove the expensive Argon2/LLM call is not reached after exhaustion.

- [ ] **Step 4: Keep this task open if no shared store exists**

Report `blocked: shared durable rate-limit storage not approved`; do not mislabel an in-memory fallback as production protection.

### Task 5: Remove tracked seed passwords from the current tree

**Files:**
- Modify: `scripts/seed-production.ts`
- Modify: `.env.example`
- Modify: `SISTEM_DOKUMANTASYONU.md`

- [ ] **Step 1: Add a test or static check proving no `password: 'literal'` remains in tracked seed scripts**

- [ ] **Step 2: Replace per-person literal passwords with required environment input or generated one-time values that are never printed in full**

- [ ] **Step 3: Document required environment variable names without values**

- [ ] **Step 4: Run `git grep -n -E "password:\s*['\"]" -- scripts` and verify no credential literals**

- [ ] **Step 5: Record that Git history and real credential rotation remain external operations**

### Task 6: Dependency audit classification

**Files:**
- Modify only after proof: `package.json`, `bun.lock`
- Create: `docs/superpowers/logs/2026-07-12-dependency-audit.md`

- [ ] **Step 1: Capture `bun audit --json` findings and `bun pm why` paths**

- [ ] **Step 2: Classify each advisory as direct/transitive and runtime/dev-only**

- [ ] **Step 3: Remove a direct dependency only when `rg` proves no runtime or build usage**

- [ ] **Step 4: Run install, tests and build after each dependency slice; never run `bun update --latest`**

- [ ] **Step 5: Leave upstream-only findings documented rather than forcing unsafe overrides**

### Task 7: Migration and external security rehearsal gate

**Files:**
- Modify: `docs/superpowers/logs/2026-07-12-program-status-and-handoff.md`
- Do not promote: `prisma/migration-drafts/202607110002_periods_constraints_import_batches/migration.sql`

- [ ] **Step 1: Verify only the presence of staging/backup configuration; never print values**

- [ ] **Step 2: If no anonymized staging database is supplied, record the migration rehearsal as blocked**

- [ ] **Step 3: If supplied, run inventory and duplicate scans before a dry-run rehearsal**

- [ ] **Step 4: Never run `prisma migrate deploy` against production without separate approval**

- [ ] **Step 5: Record Neon credential rotation/log review as externally unverified unless the signed-in Neon account is explicitly available**

### Task 8: Full verification and Chrome release rehearsal

**Files:**
- Modify: `docs/superpowers/logs/2026-07-12-program-status-and-handoff.md`

- [ ] **Step 1: Run `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`, and `git diff --check`**

- [ ] **Step 2: In Chrome, test 320/375/390/768/1024/1440 after real content loads**

For dashboard and tasks, assert document scroll width equals client width and every relevant card/control right edge is within its container.

- [ ] **Step 3: Run read-only smoke checks for each available role**

Cover user, GMIM admin/chairman, DUIM admin/chairman, and dean with both department selections. Never guess passwords or inspect browser storage.

- [ ] **Step 4: Record unavailable accounts as blocked, not passed**

- [ ] **Step 5: Measure Core Web Vitals only if the required Chrome DevTools MCP is already configured; do not install it**

- [ ] **Step 6: Update the handoff with completed, remaining and blocked counts**

- [ ] **Step 7: Stop at the commit/push approval gate**
