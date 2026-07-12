import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOGBOOK_HEADINGS, validateProjectDocs } from '../../../scripts/lib/project-docs-validation'

function write(root: string, path: string, content: string) {
  const target = join(root, path)
  mkdirSync(join(target, '..'), { recursive: true })
  writeFileSync(target, content)
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), 'gmim-docs-'))
  const guides = '# Guide\n\nRead docs/INDEX.md and docs/status/CURRENT.md.\n'
  const logbook = `# Entry\n\n${LOGBOOK_HEADINGS.map((heading) => `## ${heading}\n\nEvidence.\n`).join('\n')}`

  write(root, 'AGENTS.md', guides)
  write(root, 'CLAUDE.md', guides)
  write(root, 'README.md', '# Project\n\n[Docs](docs/INDEX.md)\n')
  write(root, 'docs/INDEX.md', [
    '# Index',
    '[Current](status/CURRENT.md)',
    '[Architecture](architecture/README.md)',
    '[Runbook](runbooks/staging-e2e.md)',
    '[ADR](decisions/ADR-0001-project-memory-system.md)',
    '[Logbook](logbook/2026/2026-07-12-entry.md)',
    '`logbook/2026/2026-07-12-portal-program-closeout-and-staging.md`',
    '`logbook/2026/2026-07-12-repository-documentation-cleanup.md`',
  ].join('\n\n'))
  write(root, 'docs/status/CURRENT.md', '# Current\n\n[Evidence](../logbook/2026/2026-07-12-entry.md)\n')
  write(root, 'docs/architecture/README.md', '# Architecture\n')
  write(root, 'docs/runbooks/staging-e2e.md', '# Staging\n')
  write(root, 'docs/runbooks/TEMPLATE.md', '# Runbook template\n')
  write(root, 'docs/decisions/ADR-0001-project-memory-system.md', '# ADR\n')
  write(root, 'docs/decisions/TEMPLATE.md', '# ADR template\n')
  write(root, 'docs/logbook/TEMPLATE.md', '# Template\n')
  write(root, 'docs/logbook/2026/2026-07-12-entry.md', logbook)
  write(root, 'docs/archive/example/ARCHIVE.md', '# Archive\n\n[Current](../../status/CURRENT.md)\n')
  write(root, 'scripts/manage-e2e-accounts.ts', "throw new Error('Production URL cannot be used as the E2E base URL')\n")
  write(root, 'SISTEM_DOKUMANTASYONU.md', '# System\n\nCredentials are managed outside Git.\n')

  const trackedFiles = [
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'SISTEM_DOKUMANTASYONU.md',
    'docs/INDEX.md',
    'docs/status/CURRENT.md',
    'docs/architecture/README.md',
    'docs/runbooks/staging-e2e.md',
    'docs/runbooks/TEMPLATE.md',
    'docs/decisions/ADR-0001-project-memory-system.md',
    'docs/decisions/TEMPLATE.md',
    'docs/logbook/TEMPLATE.md',
    'docs/logbook/2026/2026-07-12-entry.md',
    'docs/archive/example/ARCHIVE.md',
    'scripts/manage-e2e-accounts.ts',
  ]

  return { root, trackedFiles }
}

describe('project documentation validation', () => {
  it('accepts a complete canonical documentation fixture', () => {
    const fixture = createFixture()

    expect(validateProjectDocs(fixture.root, {
      trackedFiles: fixture.trackedFiles,
      isIgnored: () => true,
    })).toEqual([])
  })

  it('reports guide drift, missing log headings, broken links and secret-bearing docs safely', () => {
    const fixture = createFixture()
    write(fixture.root, 'CLAUDE.md', '# Different guide\n')
    write(fixture.root, 'docs/logbook/2026/2026-07-12-entry.md', '# Incomplete\n\n## Context\n')
    write(fixture.root, 'docs/status/CURRENT.md', '# Current\n\n[Missing](../missing.md)\n')
    write(fixture.root, 'SISTEM_DOKUMANTASYONU.md', '# System\n\n| Giriş Bilgileri |\n')

    const errors = validateProjectDocs(fixture.root, {
      trackedFiles: fixture.trackedFiles,
      isIgnored: () => true,
    })

    expect(errors).toContain('guide_mismatch: AGENTS.md and CLAUDE.md differ')
    expect(errors.some((error) => error.startsWith('logbook_heading_missing:'))).toBe(true)
    expect(errors).toContain('current_logbook_link_missing: docs/status/CURRENT.md')
    expect(errors.some((error) => error.startsWith('markdown_link_broken:'))).toBe(true)
    expect(errors).toContain('credential_table_label: SISTEM_DOKUMANTASYONU.md')
    expect(errors.join('\n')).not.toContain('Giriş Bilgileri')
  })

  it('validates the repository documentation as committed', () => {
    expect(validateProjectDocs(process.cwd())).toEqual([])
  })
})
