import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { invalidateTaskRelatedQueries, taskKeys } from '@/features/tasks/queries/task-keys'

describe('task query invalidation', () => {
  it('invalidates only task, pending and dashboard scopes for the active department', async () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()

    await invalidateTaskRelatedQueries(client, 'GMIM')

    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pending-tasks', 'GMIM'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard', 'GMIM'] })
  })
})
