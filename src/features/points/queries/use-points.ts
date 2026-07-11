'use client'

import { useQuery } from '@tanstack/react-query'
import type { PointsResponse } from '@/features/points/types'

export const pointsKeys = {
  all: ['points'] as const,
  department: (department: string) => ['points', department] as const,
}

async function fetchPoints(department: string): Promise<PointsResponse> {
  const response = await fetch(`/api/points?department=${department}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Puan tablosu alınamadı')
  return data
}

export function usePoints(department: string) {
  return useQuery({ queryKey: pointsKeys.department(department), queryFn: () => fetchPoints(department) })
}
