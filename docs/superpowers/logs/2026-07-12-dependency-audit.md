# Dependency Audit — 2026-07-12

## Method

- Ran `bun audit --json` before and after the cleanup.
- Used `bun pm why <package>` for every reported package family.
- Used `rg` to verify direct-package consumers before removal.
- Did not run `bun update --latest` or add package overrides.

## Removed unused direct dependencies

The following direct packages had no consumers under `src/` or `scripts/` and were removed together with the unused `src/components/ui/chart.tsx` wrapper:

- `@mdxeditor/editor`
- `react-syntax-highlighter`
- `@reactuses/core`
- `next-auth`
- `recharts`

This removed the audit paths for `diff`, `js-cookie`, `lodash`, `lodash-es`, `prismjs`, `uuid` and the MDX/editor-side `js-yaml` path.

## Remaining findings

| Packages | Severity | Dependency path | Runtime reachability | Classification |
|---|---|---|---|---|
| `defu`, `effect` | High | `prisma -> @prisma/config` | Prisma CLI/configuration path; not imported by request handlers | Transitive build/migration tooling |
| `flatted` | High | `eslint -> file-entry-cache -> flat-cache` | Lint process only | Transitive dev-only |
| `minimatch`, `brace-expansion`, `ajv`, `@babel/core`, `js-yaml` | Low–High | ESLint and TypeScript lint plugins | Lint process only | Transitive dev-only |
| `picomatch` | Moderate–High | ESLint/Vitest/Vite globbing | Test/lint process only | Transitive dev-only |
| `postcss@8.4.31` | Moderate | `next` | Next.js build CSS processing; application CSS is repository-controlled | Transitive build-time |

## Decision

No remaining advisory has a verified path from untrusted portal request data to the vulnerable API in production request handling. The high findings remain worth tracking, but forcing transitive overrides could break Prisma, ESLint, Vitest or Next.js and was not attempted.

Re-run `bun audit --json` after normal upstream Prisma/Next.js/ESLint/Vitest upgrades. Upgrade one direct tool at a time and require the complete test, typecheck, lint and production-build gates.
