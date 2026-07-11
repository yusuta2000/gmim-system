import type { CalendarDomain } from '@/features/calendar/types'

export const calendarKeys = {
  all: ['calendar'] as const,
  domain: (department: string, domain: CalendarDomain) => [...calendarKeys.all, department, domain] as const,
  exams: (department: string) => calendarKeys.domain(department, 'exams'),
  schedule: (department: string) => calendarKeys.domain(department, 'schedule'),
}
