'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { taskKeys } from '@/features/tasks/queries/task-keys'
import type { TaskFilters, TaskListResponse } from '@/features/tasks/types'

export async function fetchTasks(department: string, filters: TaskFilters): Promise<TaskListResponse> {
  const params = new URLSearchParams({
    department,
    page: String(filters.page),
    pageSize: String(filters.pageSize || 20),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.assistantId) params.set('assistantId', filters.assistantId)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)

  const response = await fetch(`/api/tasks?${params.toString()}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Görevler alınamadı')
  return data
}

export function useTasks(department: string, filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(department, filters),
    queryFn: () => fetchTasks(department, filters),
    placeholderData: keepPreviousData,
  })
}
