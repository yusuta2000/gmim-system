import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/features/dashboard/components/dashboard-screen.tsx'),
  'utf8',
)

describe('dashboard responsive contracts', () => {
  it('keeps intrinsic content from widening narrow grid tracks', () => {
    expect(source).toContain('grid min-w-0 gap-6')
    expect(source).toContain('className="min-w-0 space-y-6"')
    expect(source).toContain('className="min-w-0 rounded-xl border border-border bg-surface"')
  })

  it('opens exams inside the existing calendar route', () => {
    expect(source).toContain("portalHref('/calendar?domain=exams', user, department)")
    expect(source).not.toContain("portalHref('/exams', user, department)")
  })
})
