# P02.3a Personnel API Authorization Implementation Plan

**Goal:** Move password and personnel-management routes from caller-supplied IDs and plaintext passwords to server sessions, hashed passwords, role checks, and department checks.

## Order

1. Add route-test helpers that mock `requireSession`, role/department policy, and Prisma.
2. Migrate `change-password`: session user only, verify its own hash, write a new `passwordHash`.
3. Migrate `reset-password`, `toggle-active`, and `toggle-role`: manager role plus target department access; remove `requesterId`.
4. Migrate `add-assistant` and `remove-assistant`: manager role plus requested/target department access; remove `requesterId`.
5. For every route, add unauthenticated and cross-department tests before implementation; return `UNAUTHENTICATED` or `FORBIDDEN` without disclosing password hashes.

## Constraints

- Do not fall back to plaintext `password` in any migrated route.
- Do not commit or push `src/app/page.tsx` user changes.
- No migration is required for code changes, but do not deploy before the existing session/password migration and rehearsal complete.
- Commit after each route group only with user approval.

## First Commit

`change-password` only: test missing session and wrong password hash; derive user ID from `requireSession`; update only `passwordHash`; revoke existing sessions except the caller's newly issued session strategy, to be finalized with logout/session integration.
