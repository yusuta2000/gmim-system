# P02.1 Passwords and Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plaintext-password authentication with hashed credentials and an HttpOnly server-side session foundation, without applying a production migration until it has been rehearsed.

**Architecture:** `ResearchAssistant` gains a nullable password hash and a one-to-many `Session` relation. Login verifies the hash, creates an opaque random session token, stores only its SHA-256 digest, and returns the token only through an HttpOnly cookie. Existing plaintext values are never returned; their one-time migration is a separately approved production operation.

**Tech Stack:** Next.js 16 route handlers, Prisma 6/PostgreSQL, Vitest, `@node-rs/argon2` for Argon2id, Node Web Crypto.

## Global Constraints

- Do not run a migration, seed, import, reset, or password-conversion update against production without a backup, dry-run report, staging rehearsal, and explicit user approval.
- Never log, return, test with, or commit a real password, session token, connection string, or cookie value.
- `src/app/page.tsx` has unrelated uncommitted UI changes; do not include them in P02.1 commits.
- Each task requires a separate user-approved commit; push is a separate approval.

---

### Task 1: Add password and session primitives with tests

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/session-token.ts`
- Create: `src/lib/auth/__tests__/password.test.ts`
- Create: `src/lib/auth/__tests__/session-token.test.ts`

**Interfaces:**

```ts
export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(hash: string, password: string): Promise<boolean>
export function createSessionToken(): string
export async function hashSessionToken(token: string): Promise<string>
```

- [ ] Add `@node-rs/argon2` as a production dependency with `bun add @node-rs/argon2`.
- [ ] Write `password.test.ts` with a non-secret fixture such as `test-password-123` and assert that a hash differs from input, verifies the correct input, and rejects a different input.
- [ ] Write `session-token.test.ts` to assert that two tokens are distinct, the token is at least 32 random bytes encoded as URL-safe text, and SHA-256 produces a stable digest that differs from the token.
- [ ] Implement `password.ts` with `hash` and `verify` from `@node-rs/argon2`, explicitly selecting `Algorithm.Argon2id`.
- [ ] Implement `session-token.ts` with `crypto.randomBytes(32).toString('base64url')` and `crypto.createHash('sha256').update(token).digest('hex')`.
- [ ] Run `bun test src/lib/auth/__tests__/password.test.ts src/lib/auth/__tests__/session-token.test.ts`; expected result: all assertions pass.
- [ ] Request approval and commit only Task 1 files as `feat(auth): add password and session primitives`.

### Task 2: Add the un-applied Prisma migration and session repository

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_sessions_and_password_hash/migration.sql`
- Create: `src/lib/auth/session-repository.ts`
- Create: `src/lib/auth/__tests__/session-repository.test.ts`

**Schema contract:**

```prisma
model ResearchAssistant {
  passwordHash String?
  sessions     Session[]
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  userId    String
  user      ResearchAssistant @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}
```

- [ ] Write a repository test with a mocked Prisma client. Assert `createSession` persists only `tokenHash`, expiration, and user ID; assert `findSessionUser` rejects expired sessions; assert `deleteSession` deletes by hashed token.
- [ ] Add the schema fields and model exactly as above. Keep the old `password` column temporarily so a controlled production conversion can be rehearsed.
- [ ] Implement `createSession`, `findSessionUser`, and `deleteSession` in `session-repository.ts`; select only `id`, `role`, and `department` when returning a session user.
- [ ] Generate migration SQL from a disposable/staging database only. Do not use `prisma migrate dev` against the production connection. The migration must add nullable `passwordHash`, create `Session`, create both indexes, and add the foreign key.
- [ ] Run `bun x prisma validate`, unit tests, lint, and typecheck.
- [ ] Stop before applying the migration. Report the migration SQL summary and request a staging rehearsal plus production-write approval.
- [ ] Request approval and commit only the schema, migration, repository, and tests as `feat(auth): add session schema`.

### Task 3: Issue and revoke secure cookies through auth routes

**Files:**

- Modify: `src/app/api/login/route.ts`
- Create: `src/app/api/logout/route.ts`
- Create: `src/app/api/session/route.ts`
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/__tests__/session.test.ts`

**Interfaces:**

```ts
export const SESSION_COOKIE = 'itudf_session'
export async function requireSession(): Promise<SessionUser>
export function sessionCookie(token: string, expiresAt: Date): CookieOptions
export function expiredSessionCookie(): CookieOptions
```

- [ ] Write failing tests that assert a successful login sets an HttpOnly cookie with `sameSite: 'lax'`, `path: '/'`, expiry matching the session, and `secure: true` when `NODE_ENV === 'production'`.
- [ ] Write failing tests that assert login never returns `password` or `passwordHash`, `/api/session` returns only session user fields, and logout deletes the database session then expires the cookie.
- [ ] Implement `session.ts` to read the cookie with `next/headers`, hash it, load the session user, and throw a typed `UNAUTHENTICATED` error when absent, expired, or invalid.
- [ ] Replace plaintext comparison in `login/route.ts` with `verifyPassword`. Do not deploy this route until every active user has a `passwordHash`; reject accounts lacking a hash with a generic credential error instead of falling back to plaintext.
- [ ] Create the session after verification, set its cookie on the response, and add POST `/api/logout` plus GET `/api/session`.
- [ ] Run route tests, `bun test`, lint, typecheck, and `bun run build`.
- [ ] Request approval and commit only Task 3 files as `feat(auth): issue server-side sessions`.

### Task 4: Rehearse the password conversion before any production write

**Files:**

- Create: `scripts/prepare-password-hash-migration.ts`
- Create: `docs/superpowers/logs/<date>-p02-1-password-migration-rehearsal.md`

**Script contract:**

```text
bun scripts/prepare-password-hash-migration.ts          # dry-run, no writes
bun scripts/prepare-password-hash-migration.ts --commit # requires an explicitly named non-production DATABASE_URL
```

- [ ] Make dry-run output only aggregate counts: active accounts, missing hashes, and already-hashed accounts. It must never print names, e-mails, passwords, URLs, or hashes.
- [ ] Refuse `--commit` when `NODE_ENV` is `production` or when a required `ALLOW_PASSWORD_HASH_MIGRATION=yes` guard is absent.
- [ ] Rehearse the migration on a backup/staging copy and record only counts and command exit statuses in the log.
- [ ] Present the rehearsal evidence and a rollback statement to the user. Stop for explicit production-write approval; do not apply production conversion in this task.

## Completion Gates

- All new passwords are Argon2id hashes; plaintext credentials are neither returned nor used by the new login path.
- Session tokens are random, opaque, stored only as hashes, and carried only in secure HttpOnly cookies.
- A valid session can be loaded server-side and revoked.
- No production migration or password update has occurred without the separate approved rehearsal.

## Scope Deferred to Follow-up Plans

- P02.2: role/department authorization helpers and matrix tests.
- P02.3a–e: API route migrations in the master-plan order.
- UI removal of `localStorage` identity state after protected APIs are migrated.
