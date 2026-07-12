# P02.2 Authorization Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define one tested role and department authorization policy for all future API migrations.

**Architecture:** Reuse `SessionUser` from the session repository. Pure policy functions make role and department decisions without database or cookie access; a tiny error class gives routes stable `UNAUTHENTICATED` and `FORBIDDEN` responses.

**Tech Stack:** TypeScript, Vitest, Next.js route handlers.

## Global Constraints

- This task must not migrate existing API routes or write to a database.
- Only `dekan` may access both GMIM and DUIM; `user`, `admin`, and `baskan` may access only their own department.
- A missing session maps to `UNAUTHENTICATED`; a valid session lacking permission maps to `FORBIDDEN`.
- Commit requires user approval; push remains blocked until the session schema/password rehearsal is safely deployed.

---

### Task 1: Add the role and department policy with a complete matrix test

**Files:**

- Create: `src/lib/authorization/errors.ts`
- Create: `src/lib/authorization/roles.ts`
- Create: `src/lib/authorization/department.ts`
- Create: `src/lib/authorization/__tests__/matrix.test.ts`

**Interfaces:**

```ts
export type AuthorizationErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN'
export class AuthorizationError extends Error { code: AuthorizationErrorCode }
export function requireRole(user: SessionUser, roles: SessionUser['role'][]): void
export function assertDepartmentAccess(user: SessionUser, department: SessionUser['department']): void
```

- [ ] Write a table-driven test for all four roles against GMIM and DUIM. Assert that a dekan is allowed in both departments and each other role is allowed only where `user.department` equals the requested department.
- [ ] Add tests that `requireRole` accepts listed roles and throws `AuthorizationError` with `FORBIDDEN` for other roles.
- [ ] Implement `AuthorizationError` so its message and `code` equal the supplied error code.
- [ ] Implement `requireRole` with `roles.includes(user.role)` and throw `FORBIDDEN` when false.
- [ ] Implement `assertDepartmentAccess` with `user.role === 'dekan' || user.department === department`; throw `FORBIDDEN` when false.
- [ ] Run `bun test src/lib/authorization/__tests__/matrix.test.ts`, `bun test`, `bun run lint`, and `bun run typecheck`; all must pass.
- [ ] Request commit approval and commit only these files as `feat(auth): add authorization policy`.

## Completion Gate

- Every later route can make a deterministic role and department decision through one tested policy.
- No route behavior or production data changes in this task.
