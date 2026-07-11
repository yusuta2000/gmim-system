import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('portal design tokens', () => {
  it('defines the semantic surface and status vocabulary', () => {
    for (const token of [
      '--surface:',
      '--surface-muted:',
      '--text-primary:',
      '--text-secondary:',
      '--success:',
      '--warning:',
      '--info:',
      '--destructive:',
    ]) {
      expect(css).toContain(token)
    }
  })

  it('provides light, dark, GMIM and DUIM token scopes', () => {
    expect(css).toContain(':root {')
    expect(css).toContain('.dark {')
    expect(css).toContain("[data-department='GMIM']")
    expect(css).toContain("[data-department='DUIM']")
    expect(css).toContain(".dark [data-department='GMIM']")
    expect(css).toContain(".dark [data-department='DUIM']")
  })

  it('labels the shared identity colors as brand tokens without an official claim', () => {
    expect(css).toContain('--brand-navy:')
    expect(css).toContain('--brand-gold:')
    expect(css.toLocaleLowerCase('tr-TR')).not.toContain('resmî')
    expect(css.toLocaleLowerCase('tr-TR')).not.toContain('resmi')
  })
})
