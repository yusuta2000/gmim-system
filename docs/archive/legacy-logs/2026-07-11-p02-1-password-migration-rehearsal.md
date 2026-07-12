# P02.1 Password Migration Rehearsal Log — 2026-07-11

## Script Prepared

`scripts/prepare-password-hash-migration.ts` supports a no-write default mode and a guarded non-production commit mode.

## Safety Guards

- Default invocation performs counts only.
- `--commit` is rejected when `NODE_ENV=production`.
- `--commit` also requires `ALLOW_PASSWORD_HASH_MIGRATION=yes`.
- Script output contains aggregate counts only; it does not print account identifiers, passwords, hashes, URLs, or tokens.

## Pending Rehearsal

No staging database is configured in this workspace, so no dry-run count or write rehearsal has been executed. A staging backup must receive the session migration first. Record only aggregate counts and exit statuses here after that rehearsal; request separate approval before any production migration or password conversion.
