import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'scripts/manage-e2e-accounts.ts'), 'utf8')

describe('E2E account manifest', () => {
  it('covers both departments and every role with one faculty-wide dean', () => {
    expect(source.match(/id: 'e2e-/g)).toHaveLength(7)
    expect(source).toContain("role: 'user', department: 'GMIM'")
    expect(source).toContain("role: 'admin', department: 'GMIM'")
    expect(source).toContain("role: 'baskan', department: 'GMIM'")
    expect(source).toContain("role: 'user', department: 'DUIM'")
    expect(source).toContain("role: 'admin', department: 'DUIM'")
    expect(source).toContain("role: 'baskan', department: 'DUIM'")
    expect(source).toContain("role: 'dekan', department: 'GMIM'")
  })

  it('keeps generation explicit and credentials local', () => {
    expect(source).toContain("args.includes('--generate')")
    expect(source).toContain("credentialsPath = 'local-e2e-credentials.json'")
    expect(source).toContain("args.includes('--refresh-sql')")
    expect(source).toContain('Production URL cannot be used as the E2E base URL')
    expect(source).toContain("'e2e-category-meeting'")
    expect(source).toContain("'e2e-category-exam'")
    const passwordLiteral = /password:\s*['"][^'"]+['"]/

    expect(source).not.toMatch(passwordLiteral)
  })
})
