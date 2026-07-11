'use client'

import { useQuery } from '@tanstack/react-query'
import type { DashboardData } from '@/features/dashboard/types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  department: (department: string) => ['dashboard', department] as const,
}

async function fetchDashboard(department: string): Promise<DashboardData> {
  const response = await fetch(`/api/dashboard?department=${department}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Özet bilgileri alınamadı')
  return data
}

export function useDashboard(department: string) {
  return useQuery({
    queryKey: dashboardKeys.department(department),
    queryFn: () => fetchDashboard(department),
  })
}
