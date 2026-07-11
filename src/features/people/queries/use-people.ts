'use client'

import { useQuery } from '@tanstack/react-query'
import { peopleKeys } from './people-keys'
import type { PersonDto } from '@/features/people/types'

export function usePeople(department: string) {
  return useQuery({
    queryKey: peopleKeys.list(department),
    queryFn: async () => {
      const response = await fetch(`/api/people?department=${department}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Personel alınamadı')
      return data as PersonDto[]
    },
  })
}
