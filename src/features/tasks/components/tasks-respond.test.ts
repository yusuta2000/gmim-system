import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/features/tasks/components/tasks-screen.tsx'),
  'utf8',
)

describe('task respond contract', () => {
  it('lets any assignee answer an assigned task, including managers', () => {
    expect(source).toContain("const canRespond = task.assistantId === userId && task.status === 'assigned'")
  })
})
