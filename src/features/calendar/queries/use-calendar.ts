'use client'

import { useQuery } from '@tanstack/react-query'
import { calendarKeys } from './calendar-keys'
import type { CalendarExam, WeeklyScheduleEntry } from '@/features/calendar/types'

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'Veri alınamadı')
  return data as T
}

export function useCalendarExams(department: string) {
  return useQuery({
    queryKey: calendarKeys.exams(department),
    queryFn: async () => readJson<CalendarExam[]>(await fetch(`/api/exams?department=${department}`)),
  })
}

export function useWeeklySchedule(department: string) {
  return useQuery({
    queryKey: calendarKeys.schedule(department),
    queryFn: async () => readJson<WeeklyScheduleEntry[]>(await fetch(`/api/weekly-schedule?department=${department}`)),
  })
}
