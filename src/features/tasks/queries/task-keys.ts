import type { QueryClient } from '@tanstack/react-query'
import type { TaskFilters } from '@/features/tasks/types'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (department: string, filters: TaskFilters) => [...taskKeys.lists(), department, filters] as const,
}

export async function invalidateTaskRelatedQueries(queryClient: QueryClient, department: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['pending-tasks', department] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', department] }),
  ])
}
