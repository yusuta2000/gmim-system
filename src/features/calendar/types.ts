export type CalendarSupervisor = {
  id: string
  assistantId: string
  assistant: { id: string; name: string }
}

export type CalendarExam = {
  id: string
  courseCode: string
  courseName: string
  instructor: string
  date: string
  day: string
  timeSlot: string
  classroom: string | null
  requiredSupervisors: number
  notes: string | null
  supervisors: CalendarSupervisor[]
}

export type WeeklyScheduleEntry = {
  id: string
  assistantId: string
  dayOfWeek: number
  timeSlot: string
  description: string
  assistant: { id: string; name: string }
}

export type CalendarView = 'month' | 'week' | 'agenda'
export type CalendarDomain = 'exams' | 'schedule'
