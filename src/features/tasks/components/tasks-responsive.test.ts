import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/features/tasks/components/tasks-screen.tsx'),
  'utf8',
)

describe('task filter responsive contracts', () => {
  it('keeps the filter grid and search field shrinkable', () => {
    expect(source).toContain('mx-auto min-w-0 max-w-7xl space-y-5')
    expect(source).toContain('min-w-0 rounded-xl border border-border bg-surface p-4')
    expect(source).toContain('grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4')
    expect(source).toContain('relative min-w-0 sm:col-span-2')
  })

  it('bounds every native select and the action row to its grid track', () => {
    const boundedSelects = source.match(/className="h-11 w-full min-w-0 rounded-md/g) ?? []

    expect(boundedSelects).toHaveLength(3)
    expect(source).toContain('className="flex min-w-0 w-full gap-2"')
  })
})
