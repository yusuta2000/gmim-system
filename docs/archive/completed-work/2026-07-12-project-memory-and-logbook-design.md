# Project Memory and Logbook Design

**Date:** 2026-07-12

**Status:** Approved design

**Audience:** Project operators, developers, and AI coding sessions

## 1. Purpose

Create a project-local memory system that explains what changed, why it changed, how it was verified, and what remains open. A new human or AI session must be able to orient itself without repeating completed work or trusting stale plan checkboxes.

The system serves two audiences at once:

- Humans receive explanatory context, operational instructions, decisions, and evidence.
- AI sessions receive a strict read order, source-of-truth hierarchy, start protocol, close protocol, and stop conditions.

## 2. Non-negotiable principles

1. Every document has one primary responsibility.
2. Current state and historical evidence are stored separately.
3. Every meaningful work session creates one append-only logbook entry.
4. Published logbook entries are not rewritten. Corrections are later addenda. Secret removal is the only exception.
5. Plans and specifications express intent; they never prove that work was completed.
6. Code, schema, tests, Git history, and current live verification outrank narrative documentation when facts conflict.
7. Production credentials, passwords, hashes, tokens, session identifiers, and connection strings never appear in tracked documentation.
8. Unknown or user-owned untracked files are classified before deletion.
9. `AGENTS.md` and `CLAUDE.md` remain byte-for-byte identical.
10. A session may not repeat a completed operation merely because an old plan still contains an unchecked box.

## 3. Canonical directory structure

```text
D:\gmim-system\
├─ README.md
├─ AGENTS.md
├─ CLAUDE.md
├─ SISTEM_DOKUMANTASYONU.md
└─ docs\
   ├─ INDEX.md
   ├─ status\
   │  └─ CURRENT.md
   ├─ logbook\
   │  └─ YYYY\
   │     └─ YYYY-MM-DD-topic.md
   ├─ decisions\
   │  └─ ADR-NNNN-topic.md
   ├─ runbooks\
   │  ├─ deployment.md
   │  ├─ staging-e2e.md
   │  └─ database-operations.md
   ├─ architecture\
   ├─ testing\
   ├─ superpowers\
   │  ├─ specs\
   │  └─ plans\
   └─ archive\
```

Directory and file names use stable English ASCII names. Document prose is Turkish, with established technical terms retained in English where clearer.

## 4. Document responsibilities

### `README.md`

The two-to-three-minute entry point. It states the product purpose, stack, live and staging environments without secrets, setup commands, verification commands, deployment summary, documentation entry point, and safety warnings. It does not become a second technical manual.

### `docs/INDEX.md`

The document router. Every canonical document is listed with its purpose, lifecycle state, and intended reader. It defines the mandatory reading order and points old paths to their canonical replacements.

### `docs/status/CURRENT.md`

The only current status board. It contains:

- current production and staging state;
- last verified commit and date;
- completed capabilities at summary level;
- open work and explicit blockers;
- external operations that are not repository-verifiable;
- latest test/build/browser evidence;
- links to relevant logbook entries, decisions, and runbooks.

It is updated only when current state changes. It is not append-only.

### `docs/logbook/YYYY/YYYY-MM-DD-topic.md`

One immutable record for each meaningful session. A meaningful session changes code, data, infrastructure, security posture, operational knowledge, or verified project status. Pure discussion without a decision or artifact does not require an entry.

Each entry must contain:

```markdown
# YYYY-MM-DD — Short title

## Context
## Objectives
## Starting state
## Work completed
## Why these choices were made
## How it was implemented
## Verification and evidence
## Data, security, and environment impact
## Commits and deployments
## Decisions created or superseded
## Remaining work and explicit blockers
## Instructions for the next session
## Addenda
```

The verification section records commands and summarized results, not merely “tests passed.” Failed attempts that materially changed the chosen approach are recorded. Routine exploratory noise is omitted.

### `docs/decisions/ADR-NNNN-topic.md`

Architecture Decision Records preserve decisions whose rationale must survive the current implementation. Each ADR contains status, context, decision, alternatives, consequences, migration impact, and links to evidence. A changed decision creates a superseding ADR; the older ADR remains historical.

### `docs/runbooks/`

Repeatable operational procedures. Every runbook includes prerequisites, target environment, dry-run, execution, verification, rollback, secret-handling rules, and stop conditions. Database, deployment, staging E2E, credential rotation, and recovery procedures belong here.

### `docs/superpowers/specs/` and `docs/superpowers/plans/`

Specs describe approved designs. Plans describe implementation steps. Completed plans are marked complete or moved to the archive after their final state is represented in `CURRENT.md` and a logbook entry. Their checkboxes are not used as the project status board.

### `docs/archive/`

Superseded documents that retain historical or audit value. Every archived document receives a header that states why it was archived and links to its canonical replacement. Temporary generated outputs and secrets are deleted, not archived.

## 5. Source-of-truth hierarchy

Operational rules and factual truth are evaluated separately.

### Operational authority

1. `AGENTS.md` and identical `CLAUDE.md`
2. Environment-specific runbook
3. Approved current plan

### Factual authority

1. Current code, schema, tests, Git history, and direct environment verification
2. `docs/status/CURRENT.md`
3. Active ADRs
4. Append-only logbook evidence
5. Archived status records
6. Specs and plans

When sources conflict, the session verifies the higher authority and fixes the lower document. It must not silently choose whichever document supports the easiest action.

## 6. Mandatory AI session protocol

The following compact protocol is added identically to `AGENTS.md` and `CLAUDE.md`.

### Start protocol

1. Read `docs/INDEX.md`.
2. Read `docs/status/CURRENT.md`.
3. Read the runbook relevant to the requested operation.
4. Read only the latest linked logbook/ADR/spec/plan records needed for the task.
5. Check `git status`, current branch, recent commits, and upstream status.
6. Compare the request with completed work and open gates before proposing or repeating anything.
7. Treat production writes, destructive cleanup, migrations, credential changes, and history rewriting as separate high-risk operations.

### During-work protocol

1. Keep changes scoped and preserve unrelated worktree files.
2. Record decisions when alternatives or long-lived constraints exist.
3. Update the current status only after verification changes project truth.
4. Never copy secrets into terminal output, docs, commits, screenshots, or chat.

### Close protocol

1. Run verification proportional to the change.
2. Create or update the session logbook entry.
3. Update `CURRENT.md` if current truth changed.
4. Update `INDEX.md` when documents are added, moved, archived, or superseded.
5. Record commit, push, deployment, production-data impact, and remaining blockers accurately.
6. Confirm `AGENTS.md` and `CLAUDE.md` are identical.
7. Confirm no secret or temporary artifact was staged.

### Mandatory stop conditions

The session stops and reports the conflict instead of guessing when:

- the requested operation contradicts `CURRENT.md` or a higher factual source;
- the target database/environment cannot be proven;
- a production write, destructive action, credential rotation, or history rewrite lacks its required authorization;
- an unknown untracked file would need deletion or overwrite;
- secrets are found in tracked content and the required external rotation status is unknown.

## 7. Repository cleanup and migration

Cleanup is classification-driven, not a bulk delete.

1. Inventory every root-level file and every document with tracked/untracked status, purpose, sensitivity, and canonical destination.
2. Create the new entry-point, index, status, logbook, decision, runbook, architecture, and archive directories.
3. Convert `docs/superpowers/logs/2026-07-12-program-status-and-handoff.md` into current status plus one or more append-only historical logbook records.
4. Move reusable staging instructions from `docs/testing/STAGING_E2E.md` into `docs/runbooks/staging-e2e.md`, leaving a compatibility pointer if needed.
5. Keep active specs/plans under `docs/superpowers/`; archive completed or superseded artifacts with replacement links.
6. Classify the current untracked plans/specs and root reports before staging, moving, archiving, ignoring, or deleting them.
7. Remove generated tool outputs and temporary analysis artifacts only after confirming that they contain no unique project evidence.
8. Sanitize tracked documentation that contains real plaintext login credentials. Document the removal without reproducing the credentials and create an explicit external rotation gate.
9. Add a repository root map to `README.md` and a concise documentation map to both AI guide files.

No cleanup commit may mix unexplained deletion of user-owned files with the documentation migration.

## 8. Guardrails and validation

A small repository validation script and test suite enforce structure without generating prose. They check:

- `AGENTS.md` and `CLAUDE.md` are byte-identical;
- required canonical files exist;
- every active canonical document is registered in `docs/INDEX.md`;
- every logbook file contains the required headings;
- `CURRENT.md` links to the latest relevant logbook entry;
- archived documents identify their replacement or archival reason;
- tracked text does not match prohibited secret patterns;
- local credential/reset files remain ignored;
- internal Markdown links resolve.

The validator fails loudly but does not rewrite documentation automatically.

## 9. Migration commit strategy

The implementation uses small reversible commits:

1. Add documentation skeleton, README, index, and current-status model.
2. Add logbook/ADR/runbook templates and AI session protocol.
3. Migrate current tracked logs, staging guidance, specs, and plans.
4. Classify and handle pre-existing untracked/root artifacts without deleting unknown files silently.
5. Sanitize tracked credentials and record the external rotation gate.
6. Add validation script/tests and run the full quality suite.

Each commit is preceded by shared-main synchronization. Force-push is prohibited.

## 10. Acceptance criteria

- A new human can find setup, architecture, current status, operational procedures, and history from `README.md` and `docs/INDEX.md`.
- A new AI session follows the same deterministic start and close protocol from both guide files.
- Current status contains no stale plan-as-status ambiguity.
- Completed work is not repeated unless fresh verification is explicitly required.
- Every meaningful future session has a consistent append-only record.
- Existing valuable history remains accessible through canonical paths or archive pointers.
- Unknown untracked user files are preserved until classified.
- No tracked document contains real plaintext credentials or connection material.
- Documentation structure and secret/link invariants are executable checks.
- `AGENTS.md` and `CLAUDE.md` remain byte-identical after the migration.

## 11. Out of scope

- Rewriting Git history.
- Rotating production credentials without a separately verified external operation.
- Production database migrations or data changes.
- Building a documentation website or automatic prose generator.
- Replacing Git history with narrative logs.
