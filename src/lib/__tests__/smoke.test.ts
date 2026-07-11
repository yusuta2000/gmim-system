import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('test harness', () => {
  it('resolves the project path alias', () => {
    expect(cn('portal', false && 'hidden')).toBe('portal')
  })
})
