import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'

export const LOGBOOK_HEADINGS = [
  'Context',
  'Objectives',
  'Starting state',
  'Work completed',
  'Why these choices were made',
  'How it was implemented',
  'Verification and evidence',
  'Data, security, and environment impact',
  'Commits and deployments',
  'Decisions created or superseded',
  'Remaining work and explicit blockers',
  'Instructions for the next session',
  'Addenda',
] as const

const REQUIRED_FILES = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'SISTEM_DOKUMANTASYONU.md',
  'docs/INDEX.md',
  'docs/status/CURRENT.md',
  'docs/architecture/README.md',
  'docs/logbook/TEMPLATE.md',
  'docs/decisions/TEMPLATE.md',
  'docs/decisions/ADR-0001-project-memory-system.md',
  'docs/runbooks/TEMPLATE.md',
  'docs/runbooks/staging-e2e.md',
] as const

const INDEX_REGISTRATIONS = [
  'status/CURRENT.md',
  'architecture/README.md',
  'runbooks/staging-e2e.md',
  'decisions/ADR-0001-project-memory-system.md',
  'logbook/2026/2026-07-12-portal-program-closeout-and-staging.md',
  'logbook/2026/2026-07-12-repository-documentation-cleanup.md',
] as const

const TEXT_EXTENSIONS = new Set(['', '.cjs', '.css', '.env', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt', '.yaml', '.yml'])

export type ProjectDocsValidationOptions = {
  trackedFiles?: string[]
  isIgnored?: (path: string) => boolean
}

function toPosix(path: string) {
  return path.split(sep).join('/')
}

function trackedFilesFromGit(root: string) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map(toPosix)
}

function ignoredByGit(root: string, path: string) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', path], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function read(root: string, path: string) {
  return readFileSync(join(root, path), 'utf8')
}

function validateMarkdownLinks(root: string, trackedFiles: string[], errors: string[]) {
  const markdownFiles = trackedFiles.filter((path) => {
    if (!path.endsWith('.md')) return false
    if (!path.startsWith('docs/archive/')) return true
    return path.endsWith('/ARCHIVE.md')
  })

  for (const path of markdownFiles) {
    const source = read(root, path)
    const links = source.matchAll(/\[[^\]]*]\(([^)]+)\)/g)
    for (const match of links) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, '')
      if (!rawTarget || rawTarget.startsWith('#') || /^(?:https?:|mailto:)/i.test(rawTarget)) continue
      const withoutTitle = rawTarget.split(/\s+["']/)[0]
      const target = decodeURIComponent(withoutTitle.split('#')[0])
      const resolved = resolve(root, dirname(path), target)
      const relativeTarget = relative(root, resolved)
      if (relativeTarget.startsWith('..') || !existsSync(resolved)) {
        errors.push(`markdown_link_broken: ${path} -> ${target}`)
      }
    }
  }
}

function validateTrackedSecrets(root: string, trackedFiles: string[], errors: string[]) {
  for (const path of trackedFiles) {
    if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase())) continue
    const source = read(root, path)

    if (path !== '.env.example' && /postgres(?:ql)?:\/\/[^\s"'<>]+@[^\s"'<>]+/i.test(source)) {
      errors.push(`database_url_literal: ${path}`)
    }
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\s*\/\s*[^\s|"']+/i.test(source)) {
      errors.push(`email_password_row: ${path}`)
    }
  }

  const systemDoc = read(root, 'SISTEM_DOKUMANTASYONU.md')
  if (systemDoc.includes('Giriş Bilgileri')) {
    errors.push('credential_table_label: SISTEM_DOKUMANTASYONU.md')
  }
}

export function validateProjectDocs(root: string, options: ProjectDocsValidationOptions = {}): string[] {
  const absoluteRoot = resolve(root)
  const errors: string[] = []
  const trackedFiles = (options.trackedFiles ?? trackedFilesFromGit(absoluteRoot)).map(toPosix)
  const isIgnored = options.isIgnored ?? ((path: string) => ignoredByGit(absoluteRoot, path))

  for (const path of REQUIRED_FILES) {
    if (!existsSync(join(absoluteRoot, path))) errors.push(`required_file_missing: ${path}`)
  }
  if (errors.some((error) => error.startsWith('required_file_missing:'))) return errors

  if (read(absoluteRoot, 'AGENTS.md') !== read(absoluteRoot, 'CLAUDE.md')) {
    errors.push('guide_mismatch: AGENTS.md and CLAUDE.md differ')
  }

  const index = read(absoluteRoot, 'docs/INDEX.md')
  for (const registration of INDEX_REGISTRATIONS) {
    if (!index.includes(registration)) errors.push(`index_registration_missing: ${registration}`)
  }

  const logbookFiles = trackedFiles.filter((path) => /^docs\/logbook\/\d{4}\/.*\.md$/.test(path))
  for (const path of logbookFiles) {
    const source = read(absoluteRoot, path)
    for (const heading of LOGBOOK_HEADINGS) {
      if (!source.includes(`## ${heading}`)) errors.push(`logbook_heading_missing: ${path} -> ${heading}`)
    }
  }

  const current = read(absoluteRoot, 'docs/status/CURRENT.md')
  if (!current.includes('../logbook/')) errors.push('current_logbook_link_missing: docs/status/CURRENT.md')

  const archiveGroups = new Set(
    trackedFiles
      .filter((path) => path.startsWith('docs/archive/'))
      .map((path) => path.split('/').slice(0, 3).join('/')),
  )
  for (const group of archiveGroups) {
    if (!existsSync(join(absoluteRoot, group, 'ARCHIVE.md'))) errors.push(`archive_metadata_missing: ${group}/ARCHIVE.md`)
  }

  const e2eSource = read(absoluteRoot, 'scripts/manage-e2e-accounts.ts')
  if (!e2eSource.includes('Production URL cannot be used as the E2E base URL')) {
    errors.push('e2e_production_url_guard_missing: scripts/manage-e2e-accounts.ts')
  }
  for (const localPath of ['local-e2e-credentials.json', 'local-e2e-reset.sql']) {
    if (!isIgnored(localPath)) errors.push(`local_secret_not_ignored: ${localPath}`)
  }

  validateMarkdownLinks(absoluteRoot, trackedFiles, errors)
  validateTrackedSecrets(absoluteRoot, trackedFiles, errors)

  return [...new Set(errors)].sort()
}
