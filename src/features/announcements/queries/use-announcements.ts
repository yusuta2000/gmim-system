'use client'

import { useQuery } from '@tanstack/react-query'
import { announcementKeys } from './announcement-keys'
import type { AnnouncementDto } from '@/features/announcements/types'

export function useAnnouncements(department: string) {
  return useQuery({
    queryKey: announcementKeys.list(department),
    queryFn: async () => {
      const response = await fetch(`/api/announcements?department=${department}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Duyurular alınamadı')
      return data as AnnouncementDto[]
    },
  })
}
