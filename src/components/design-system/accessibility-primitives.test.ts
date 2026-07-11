import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('shared accessibility primitives', () => {
  it('keeps primary buttons and icon buttons at least 44px high', () => {
    const button = source('src/components/ui/button.tsx')

    expect(button).toContain('default: "min-h-11')
    expect(button).toContain('sm: "min-h-11')
    expect(button).toContain('lg: "min-h-11')
    expect(button).toContain('icon: "size-11"')
  })

  it('keeps text and select controls at least 44px high', () => {
    expect(source('src/components/ui/input.tsx')).toContain('h-11 w-full')

    const select = source('src/components/ui/select.tsx')
    expect(select).toContain('data-[size=default]:h-11')
    expect(select).toContain('data-[size=sm]:min-h-11')
    expect(select).toContain('min-h-11')
  })

  it('keeps dialog close and tab targets at least 44px', () => {
    expect(source('src/components/ui/dialog.tsx')).toContain('size-11')

    const tabs = source('src/components/ui/tabs.tsx')
    expect(tabs).toContain('min-h-11')
  })

  it('gives loading announcements a status role', () => {
    for (const path of [
      'src/features/dashboard/components/dashboard-screen.tsx',
      'src/features/tasks/components/tasks-screen.tsx',
      'src/features/points/components/points-screen.tsx',
      'src/features/calendar/components/calendar-screen.tsx',
      'src/features/announcements/components/announcements-screen.tsx',
      'src/app/(portal)/loading.tsx',
    ]) {
      const contents = source(path)
      expect(contents).not.toMatch(/<div(?=[^>]*aria-label="[^"]*y.kleniyor")(?![^>]*role="status")/i)
    }
  })
})
