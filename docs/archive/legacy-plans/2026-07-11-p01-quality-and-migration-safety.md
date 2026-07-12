# P01 Quality and Migration Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish non-destructive test, typecheck, build, and migration-deploy gates before authentication or UI work continues.

**Architecture:** Keep application compilation independent of database mutation. A small Vitest suite establishes a repeatable test command; TypeScript includes only valid TypeScript; production schema changes move to an explicitly invoked migration-deploy operation rather than the application build command.

**Tech Stack:** Bun, Vitest, TypeScript, Next.js 16, Prisma 6, PostgreSQL.

## Global Constraints

- Do not run `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, seed, import, or any data-writing command against production without explicit user approval.
- Do not modify `src/app/page.tsx` or commit existing untracked design/spec files.
- Every task is a separate commit and requires user approval before committing; push is a separate approval.
- `AGENTS.md` and `CLAUDE.md` must remain byte-identical after edits.
- The canonical CI-quality commands must not mutate the database.

---

### Task 1: Add a minimal, deterministic Vitest gate

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/__tests__/smoke.test.ts`

**Produces:** `bun test`, `bun run test:watch`, `bun run typecheck`, and source-only `bun run lint` commands.

- [ ] Add the development dependencies with `bun add -d vitest jsdom`.
- [ ] Add these scripts to `package.json` without changing data-writing scripts:

  ```json
  {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  }
  ```

- [ ] Create `vitest.config.ts` with a `src/**/*.test.ts` and `src/**/*.test.tsx` include pattern, `jsdom` environment, and `src/test/setup.ts` as `setupFiles`.
- [ ] Create the empty `src/test/setup.ts` file.
- [ ] Create `src/lib/__tests__/smoke.test.ts`:

  ```ts
  import { describe, expect, it } from 'vitest'
  import { cn } from '@/lib/utils'

  describe('test harness', () => {
    it('resolves the project path alias', () => {
      expect(cn('portal', false && 'hidden')).toBe('portal')
    })
  })
  ```

- [ ] Run `bun test`; expected result: one passing test.
- [ ] Run `bun run lint`; expected result: ESLint scans `src` only and exits zero.
- [ ] Request user approval, then commit only the five Task 1 files with `test: add baseline Vitest harness`.

### Task 2: Make TypeScript a real build gate

**Files:**

- Delete: `scripts/import-excel-full.ts`
- Modify: `next.config.ts`
- Modify only if TypeScript reports real source errors: the exact file named by `bun run typecheck`

**Decision:** Delete `scripts/import-excel-full.ts`; it has Python syntax despite its `.ts` extension, has no repository call sites, duplicates legacy import tools, and performs destructive bulk import work. Do not replace it in this task. A future secure import workflow belongs to P04.

- [ ] Delete `scripts/import-excel-full.ts`.
- [ ] Remove the entire `typescript` object from `next.config.ts`, leaving `output: 'standalone'` and `reactStrictMode: false` unchanged.
- [ ] Run `bun run typecheck` and record every remaining file:line error in the task notes before editing any source file.
- [ ] For each remaining error, add or update a focused test where practical, apply the smallest type-correct fix, then rerun `bun run typecheck`.
- [ ] Run `bun x next build` directly, not `bun run build`; expected result: type validation runs and no Prisma schema mutation command is invoked.
- [ ] Request user approval, then commit only Task 2 files with `fix(build): enforce TypeScript validation`.

### Task 3: Separate application builds from schema deployment

**Files:**

- Modify: `package.json`
- Create: `prisma/migrations/<timestamp>_baseline/migration.sql` only after a read-only schema comparison and explicit approval
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `SISTEM_DOKUMANTASYONU.md`

**Interfaces:**

- `bun run build` runs `prisma generate && next build` and never writes to PostgreSQL.
- `bun run db:deploy` runs `prisma migrate deploy` and is an explicit production operation.

- [ ] Change the `build` script to `prisma generate && next build`.
- [ ] Add `"db:deploy": "prisma migrate deploy"`; preserve `db:push`, `db:migrate`, and `db:reset` only as explicitly named maintenance commands.
- [ ] Update the two identical agent guides to state that Vercel build must execute only generation and `next build`; migration deployment is a separate approved deployment step.
- [ ] Update `SISTEM_DOKUMANTASYONU.md` so local development uses `prisma generate`, while schema deployment uses `prisma migrate deploy` after a reviewed migration exists.
- [ ] Stop and request explicit approval before inspecting the live schema with a command that needs `DIRECT_URL`. The approved read-only comparison command is:

  ```powershell
  bun x prisma migrate diff --from-url "$env:DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script
  ```

- [ ] Save the command output only as a schema-difference summary; never log connection values.
- [ ] Create a baseline migration only after the difference is reviewed, with an approved backup and staging rehearsal. Do not use `db push` to create the baseline.
- [ ] Run `bun test`, `bun run lint`, `bun run typecheck`, and `bun run build`; all must exit zero and build output must not contain `prisma db push`.
- [ ] Request user approval, then commit only Task 3 files with `build: separate migrations from application build`.

## Verification Matrix

| Command | Expected result | Database write |
|---|---|---|
| `bun test` | Vitest suite passes | No |
| `bun run lint` | ESLint checks `src` | No |
| `bun run typecheck` | TypeScript exits zero | No |
| `bun run build` | Generate plus Next build only | No |
| `bun run db:deploy` | Applies approved migrations | Yes — separate approval |

## Baseline Evidence — 2026-07-11

- No test-runner configuration or test files are currently tracked.
- `next.config.ts` has `typescript.ignoreBuildErrors: true`.
- `package.json` runs `prisma db push` inside `build`.
- `bun x tsc --noEmit` exits 2 because `scripts/import-excel-full.ts` contains Python rather than TypeScript.
- Repository search found no call site for `scripts/import-excel-full.ts`.
