import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('tracked production seed security', () => {
  it('does not contain literal account passwords', () => {
    const sources = [
      'scripts/seed-production.ts',
      'scripts/seed-migrate.ts',
      'scripts/setup-passwords.ts',
      'scripts/lib/seed-passwords.ts',
    ].map((path) => readFileSync(join(process.cwd(), path), 'utf8')).join('\n')

    const passwordLiteral = /password:\s*['"][^'"]+['"]/

    expect(sources).not.toMatch(passwordLiteral)
    expect(sources).not.toMatch(/Şifre:\s*\$\{/)
    expect(sources).toContain('process.env.SEED_PASSWORDS_JSON')
    expect(sources).toContain('passwordHash: await seedPasswordHash')
  })
})
