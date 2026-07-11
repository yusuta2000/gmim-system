'use client'

import { useQuery } from '@tanstack/react-query'

export type TaskAssistantOption = { id: string; name: string; isActive: boolean; role: string }
export type TaskCategoryOption = { id: string; name: string; points: number; isActive: boolean }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Seçenekler alınamadı')
  return data
}

export function useTaskReferenceData(department: string, includeAssistants: boolean) {
  const assistants = useQuery({
    queryKey: ['task-assistants', department],
    queryFn: () => fetchJson<TaskAssistantOption[]>(`/api/assistants?department=${department}`),
    enabled: includeAssistants,
    select: (items) => items.filter((item) => item.isActive && (item.role === 'user' || item.role === 'admin')),
  })
  const categories = useQuery({
    queryKey: ['task-categories'],
    queryFn: () => fetchJson<TaskCategoryOption[]>('/api/categories'),
    select: (items) => items.filter((item) => item.isActive),
  })
  return { assistants, categories }
}
