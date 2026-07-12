# Project Memory and Logbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Establish a canonical human-readable and AI-enforced project memory system, migrate existing documentation safely, remove tracked plaintext credentials, and prevent stale or secret-bearing documentation from returning.

**Architecture:** Keep current truth in one mutable status document, historical evidence in append-only dated logbook entries, rationale in ADRs, and repeatable operations in runbooks. Route every reader through a root README and documentation index, enforce the same protocol in byte-identical AI guides, and validate structural/security invariants with a small Bun/TypeScript checker.

**Tech Stack:** Markdown, Git, Bun, TypeScript, Vitest, PowerShell-compatible repository scripts.

## Global Constraints

- Every document has one primary responsibility.
- Current state and historical evidence are stored separately.
- Published logbook entries are append-only; secret removal is the only rewrite exception.
- Plans/specs express intent and never prove completion.
- Unknown untracked files are classified before deletion or movement.
- Production credentials and connection material never appear in tracked documentation or tool output.
- `AGENTS.md` and `CLAUDE.md` remain byte-for-byte identical.
- No production database write, migration, credential rotation, or Git history rewrite is part of this plan.
- Pull `origin/main` immediately before each push and never force-push.

---

### Task 1: Canonical documentation entry points

**Files:**
- Create: `README.md`
- Create: `docs/INDEX.md`
- Create: `docs/status/CURRENT.md`
- Create: `docs/architecture/README.md`

**Interfaces:**
- Consumes: verified repository state, `package.json`, current Git history, and the approved design.
- Produces: deterministic entry points used by humans, AI guides, logbooks, runbooks, and validators.

- [x] **Step 1: Create the root README**

Include product purpose, production/staging URLs without credentials, stack, safe setup, `bun run test/typecheck/lint/build`, documentation reading order, and high-risk operation warnings. Link to `docs/INDEX.md`; do not duplicate the full technical manual.

- [x] **Step 2: Create the documentation index**

Use a table with `Document`, `Purpose`, `State`, and `Read when` columns. Register every active canonical document and define the order `README → INDEX → CURRENT → relevant runbook → linked evidence`.

- [x] **Step 3: Create the current-status document**

Record the current `origin/main` commit, production/staging separation, completed portal phases, 35-file/169-test evidence, 43-route build, browser role/viewport evidence, open keyboard/Core Web Vitals/rate-limit/credential-rotation/migration gates, and links to the new logbook/runbooks.

- [x] **Step 4: Create the architecture router**

Explain that `SISTEM_DOKUMANTASYONU.md` remains the detailed legacy technical manual until it is decomposed, and register its current scope without copying secrets.

- [x] **Step 5: Verify entry-point links manually**

Run:

```powershell
rg -n "docs/INDEX|docs/status/CURRENT|Production|Staging" README.md docs/INDEX.md docs/status/CURRENT.md
```

Expected: all entry points and environment labels are present, with no credential values.

- [x] **Step 6: Commit Task 1**

```powershell
git add README.md docs/INDEX.md docs/status/CURRENT.md docs/architecture/README.md
git commit -m "docs: add canonical project entry points"
```

### Task 2: Templates, decision record, and AI session protocol

**Files:**
- Create: `docs/logbook/TEMPLATE.md`
- Create: `docs/decisions/TEMPLATE.md`
- Create: `docs/decisions/ADR-0001-project-memory-system.md`
- Create: `docs/runbooks/TEMPLATE.md`
- Modify identically: `AGENTS.md`, `CLAUDE.md`
- Modify: `docs/INDEX.md`

**Interfaces:**
- Consumes: canonical paths from Task 1 and source-of-truth hierarchy from the design.
- Produces: required log/ADR/runbook schemas plus deterministic AI start, work, close, and stop protocols.

- [x] **Step 1: Add the logbook template**

Use these required second-level headings exactly: `Context`, `Objectives`, `Starting state`, `Work completed`, `Why these choices were made`, `How it was implemented`, `Verification and evidence`, `Data, security, and environment impact`, `Commits and deployments`, `Decisions created or superseded`, `Remaining work and explicit blockers`, `Instructions for the next session`, `Addenda`.

- [x] **Step 2: Add ADR and runbook templates**

The ADR template includes status/context/decision/alternatives/consequences/migration/evidence. The runbook template includes prerequisites/target/dry-run/execution/verification/rollback/secret handling/stop conditions.

- [x] **Step 3: Record ADR-0001**

Set status to `Accepted`. Record the choice of layered project memory over a single growing log or fully generated documentation.

- [x] **Step 4: Add the AI documentation protocol to both guides**

Add an identical section that requires reading `docs/INDEX.md` and `docs/status/CURRENT.md`, checking Git state, refusing stale-plan repetition, updating log/status/index at close, preserving unknown untracked files, and stopping on unverified production targets or secrets.

- [x] **Step 5: Verify guide identity**

Run:

```powershell
if ((Get-FileHash AGENTS.md).Hash -ne (Get-FileHash CLAUDE.md).Hash) { throw 'Guide mismatch' }
```

Expected: exit code 0.

- [x] **Step 6: Register new documents in the index and commit**

```powershell
git add AGENTS.md CLAUDE.md docs/INDEX.md docs/logbook/TEMPLATE.md docs/decisions docs/runbooks/TEMPLATE.md
git commit -m "docs: enforce project memory session protocol"
```

### Task 3: Migrate historical evidence and operational guidance

**Files:**
- Create: `docs/logbook/2026/2026-07-12-portal-program-closeout-and-staging.md`
- Move/rewrite: `docs/testing/STAGING_E2E.md` → `docs/runbooks/staging-e2e.md`
- Move: `docs/superpowers/logs/2026-07-12-dependency-audit.md` → `docs/logbook/2026/2026-07-12-dependency-audit.md`
- Move: remaining `docs/superpowers/logs/*.md` → `docs/archive/legacy-logs/`
- Move completed specs/plans → `docs/archive/completed-work/`
- Modify: `docs/INDEX.md`, `docs/status/CURRENT.md`, `AGENTS.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the 2026-07-12 handoff, staging guide, phase logs, current Git evidence, templates from Task 2.
- Produces: one canonical closeout logbook, one reusable staging runbook, preserved legacy evidence, and no live `docs/superpowers/logs/` status convention.

- [x] **Step 1: Create the canonical closeout logbook**

Translate the existing handoff into the required template. Preserve representative commits, reasons, implementation approach, verification counts, staging role matrix, mobile overflow results, environment impact, and explicit remaining gates.

- [x] **Step 2: Convert staging guidance into a runbook**

Add prerequisites, production/staging target check, credential-file handling, dry-run account management, reset SQL application boundary, seven-role smoke sequence, six viewport widths, rollback/reset, and stop conditions. Do not include passwords, hashes, tokens, or database URLs.

- [x] **Step 3: Archive legacy phase logs and completed workflow artifacts**

Use `git mv` for tracked files. Add `ARCHIVE.md` files to archive directories explaining the archival reason and canonical replacements. Keep active rate-limit work in `docs/superpowers/specs/`.

- [x] **Step 4: Update every old canonical-path reference**

Run:

```powershell
rg -n "docs/superpowers/logs|docs/testing/STAGING_E2E" --glob "*.md"
```

Expected: only explicit historical/archive explanations remain; operational links point to `CURRENT.md`, logbook, or runbook.

- [x] **Step 5: Update index/current/guides and commit**

```powershell
git add AGENTS.md CLAUDE.md docs
git commit -m "docs: migrate project history into logbook and runbooks"
```

### Task 4: Classify root clutter and remove tracked plaintext credentials

**Files:**
- Modify: `SISTEM_DOKUMANTASYONU.md`
- Modify: `.gitignore`
- Create: `docs/logbook/2026/2026-07-12-repository-documentation-cleanup.md`
- Create or move classified artifacts under: `docs/archive/legacy-analysis/`, `docs/archive/legacy-plans/`
- Preserve without deletion until classified: `.impeccable/`, `.superpowers/`, root reports, untracked plans/specs.

**Interfaces:**
- Consumes: `git status`, content-only classification, Git tracking state, canonical archive rules.
- Produces: a clean understandable root, preserved valuable history, ignored tool-local metadata, sanitized tracked documentation, and an explicit external rotation gate.

- [x] **Step 1: Inventory untracked/root artifacts without exposing contents**

For each artifact record path, file/directory, tracked state, approximate purpose, sensitivity, uniqueness, and action: keep canonical, archive, ignore, or delete. Do not print lines matching password/token/connection patterns.

- [x] **Step 2: Handle each artifact by classification**

Archive unique analysis/plans with provenance. Add known local tool-state directories to `.gitignore` when they have no project value. Delete only generated duplicates or empty tool output after uniqueness is disproven. Do not silently delete unknown user work.

- [x] **Step 3: Sanitize the technical documentation**

Remove the plaintext `Giriş Bilgileri` values from the role table. Replace them with role/permission descriptions and a statement that credentials are managed outside Git. Search all tracked text for database URLs and literal credential rows without printing matches.

- [x] **Step 4: Record the security consequence**

In `CURRENT.md` and the cleanup logbook, state that removed historical credentials must be treated as exposed and external rotation/revocation remains unverified. Do not reproduce the values.

- [x] **Step 5: Verify root and commit**

Run `git status --short`, confirm every remaining untracked path has an explicit classification, then commit only the reviewed cleanup set:

```powershell
git add .gitignore SISTEM_DOKUMANTASYONU.md docs README.md
git commit -m "docs(security): sanitize and organize project records"
```

### Task 5: Executable documentation validation

**Files:**
- Create: `scripts/lib/project-docs-validation.ts`
- Create: `scripts/validate-project-docs.ts`
- Create: `src/lib/docs/project-docs-validation.test.ts`
- Modify: `package.json`
- Modify: `docs/INDEX.md`

**Interfaces:**
- Produces: `validateProjectDocs(root: string): string[]`, returning human-readable errors; CLI exits 1 when errors exist and prints only safe paths/messages.
- Consumes: canonical paths, templates, index registrations, archive metadata, tracked-file list, Markdown links, and ignore rules.

- [x] **Step 1: Write failing validator tests**

Cover byte-identical guides, required files, required logbook headings, current-to-logbook link, archive metadata, production URL exclusion from local E2E base-url settings, ignored local credentials, internal Markdown links, and prohibited tracked PostgreSQL URLs/plaintext credential-table labels.

- [x] **Step 2: Run the focused test and verify failure**

```powershell
bun run test -- src/lib/docs/project-docs-validation.test.ts
```

Expected: FAIL because `validateProjectDocs` is not implemented.

- [x] **Step 3: Implement the validation library and CLI**

Use `node:fs`, `node:path`, and `node:child_process.execFileSync('git', ['ls-files'])`. Skip external/anchor links. Never print matched secret text; emit only the file path and rule identifier.

- [x] **Step 4: Add package command**

Add:

```json
"docs:check": "bun scripts/validate-project-docs.ts"
```

- [x] **Step 5: Run focused validation**

```powershell
bun run test -- src/lib/docs/project-docs-validation.test.ts
bun run docs:check
```

Expected: focused tests pass and `docs:check` reports zero errors.

- [x] **Step 6: Commit Task 5**

```powershell
git add package.json scripts/lib/project-docs-validation.ts scripts/validate-project-docs.ts src/lib/docs/project-docs-validation.test.ts docs/INDEX.md
git commit -m "test(docs): enforce project memory invariants"
```

### Task 6: Final verification and closeout

**Files:**
- Modify: `docs/status/CURRENT.md`
- Modify: `docs/logbook/2026/2026-07-12-repository-documentation-cleanup.md`
- Modify: this plan checkboxes

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified final status, evidence-bearing cleanup log, completed plan, and synchronized `origin/main`.

- [x] **Step 1: Run all quality gates**

```powershell
bun run docs:check
bun run test
bun run typecheck
bun run lint
bun run build
git diff --check
```

Expected: documentation validation, 35+ test files, TypeScript, ESLint, 43-route production build, and whitespace checks pass.

- [x] **Step 2: Verify repository invariants**

Confirm guide hashes match, local credential/reset files are ignored, no production data was changed, no unknown untracked file was deleted, and remaining `git status` entries are documented.

- [x] **Step 3: Update final evidence**

Record exact test count, build route count, commit range, cleanup classifications, secret sanitation, environment impact, and remaining external gates in the cleanup logbook and `CURRENT.md`.

- [x] **Step 4: Complete the plan and commit**

```powershell
git add docs/status/CURRENT.md docs/logbook/2026/2026-07-12-repository-documentation-cleanup.md docs/superpowers/plans/2026-07-12-project-memory-and-logbook.md
git commit -m "docs: close project memory migration"
```

- [x] **Step 5: Synchronize and push**

```powershell
git pull --rebase --autostash origin main
bun run docs:check
git push origin main
```

Expected: local `HEAD` equals `origin/main`; no force-push; only explicitly classified untracked paths remain.
