import { courseCodes, examBaremOptions, isExamRelated, normalizeTr, type BaremCategory, type BaremExam } from '@/features/calendar/barem'

// Read-only check list for past supervision points; a manager fixes anything by hand on the Tasks screen.

type SourceTask = {
  id: string
  number: number
  assistantId: string
  description: string
  date: Date
  hoursWorked: string | null
  points: number
  status: string
  notes: string | null
  category: { name: string } | null
}
type SourceExam = BaremExam & { id: string; courseCode: string }

export type ReportTask = {
  id: string
  number: number
  description: string
  hoursWorked: string | null
  points: number
  status: string
  fromCalendar: boolean
  categoryName: string | null
  date?: string
}
// extraTaskIds: tasks repeating a course already held that day (calendar-linked and older tasks count as the original).
// crossDate: a Tasks-screen entry and a calendar duty of the same course on different dates; likely one exam, needs a human check.
export type ReportGroup = { assistantName: string; day: string; tasks: ReportTask[]; extraTaskIds: string[]; crossDate: boolean }
export type ReportMismatch = {
  assistantName: string
  day: string
  task: ReportTask
  exam: { courseCode: string; courseName: string; day: string; timeSlot: string }
  suggested: { id: string; name: string; points: number }
}
export type ExamSupervisionReport = {
  checkedTasks: number
  duplicates: ReportGroup[]
  sameDay: ReportGroup[]
  mismatches: ReportMismatch[]
}

const examIdOf = (notes: string | null) => notes?.match(/\[SINAV\] (\S+)/)?.[1] ?? null
const dayKey = (date: Date) => date.toISOString().slice(0, 10)
const CROSS_DATE_WINDOW_DAYS = 31

export function buildExamSupervisionReport(input: {
  assistants: { id: string; name: string }[]
  exams: SourceExam[]
  categories: BaremCategory[]
  tasks: SourceTask[]
}): ExamSupervisionReport {
  const names = new Map(input.assistants.map((assistant) => [assistant.id, assistant.name]))
  const examById = new Map(input.exams.map((exam) => [exam.id, exam]))
  const tasks = input.tasks.filter((task) => examIdOf(task.notes) || isExamRelated(task.description) || isExamRelated(task.category?.name))
  const view = (task: SourceTask): ReportTask => ({
    id: task.id,
    number: task.number,
    description: task.description,
    hoursWorked: task.hoursWorked,
    points: task.points,
    status: task.status,
    fromCalendar: Boolean(examIdOf(task.notes)),
    categoryName: task.category?.name ?? null,
  })
  const codesOf = (task: SourceTask) => {
    const codes = new Set(courseCodes(task.description))
    const exam = examById.get(examIdOf(task.notes) ?? '')
    if (exam) codes.add(normalizeTr(exam.courseCode).replace(/\s+/g, ''))
    return codes
  }

  const groups = new Map<string, SourceTask[]>()
  for (const task of tasks) {
    const key = `${task.assistantId}|${dayKey(task.date)}`
    groups.set(key, [...(groups.get(key) ?? []), task])
  }
  const duplicates: ReportGroup[] = []
  const sameDay: ReportGroup[] = []
  for (const [key, unordered] of groups) {
    if (unordered.length < 2) continue
    const [assistantId, day] = key.split('|')
    const items = [...unordered].sort((a, b) => Number(Boolean(examIdOf(b.notes))) - Number(Boolean(examIdOf(a.notes))) || a.number - b.number)
    const seen = new Set<string>()
    const extraTaskIds: string[] = []
    for (const task of items) {
      const codes = [...codesOf(task)]
      if (codes.some((code) => seen.has(code))) extraTaskIds.push(task.id)
      codes.forEach((code) => seen.add(code))
    }
    ;(extraTaskIds.length ? duplicates : sameDay).push({ assistantName: names.get(assistantId) ?? assistantId, day, tasks: items.map(view), extraTaskIds, crossDate: false })
  }

  // A course entered on the Tasks screen with another date (e.g. the entry date) than its calendar duty.
  const alreadyExtra = new Set(duplicates.flatMap((group) => group.extraTaskIds))
  const calendarTasks = tasks.filter((task) => examIdOf(task.notes))
  for (const manual of tasks.filter((task) => !examIdOf(task.notes) && !alreadyExtra.has(task.id))) {
    const codes = codesOf(manual)
    const twin = calendarTasks.find((calendar) =>
      calendar.assistantId === manual.assistantId &&
      dayKey(calendar.date) !== dayKey(manual.date) &&
      Math.abs(calendar.date.getTime() - manual.date.getTime()) <= CROSS_DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000 &&
      [...codesOf(calendar)].some((code) => codes.has(code)))
    if (twin) {
      duplicates.push({ assistantName: names.get(manual.assistantId) ?? manual.assistantId, day: dayKey(twin.date), tasks: [view(twin), { ...view(manual), date: dayKey(manual.date) }], extraTaskIds: [manual.id], crossDate: true })
    }
  }

  const mismatches: ReportMismatch[] = []
  for (const task of tasks) {
    const exam = examById.get(examIdOf(task.notes) ?? '')
    if (!exam) continue
    const suggested = examBaremOptions(input.categories, exam).options[0]
    if (suggested && suggested.points !== task.points) {
      mismatches.push({
        assistantName: names.get(task.assistantId) ?? task.assistantId,
        day: dayKey(task.date),
        task: view(task),
        exam: { courseCode: exam.courseCode, courseName: exam.courseName ?? '', day: exam.day, timeSlot: exam.timeSlot },
        suggested: { id: suggested.id, name: suggested.name, points: suggested.points },
      })
    }
  }

  const byDay = <T extends { day: string; assistantName: string }>(rows: T[]) =>
    rows.sort((a, b) => b.day.localeCompare(a.day) || a.assistantName.localeCompare(b.assistantName, 'tr'))
  return { checkedTasks: tasks.length, duplicates: byDay(duplicates), sameDay: byDay(sameDay), mismatches: byDay(mismatches) }
}
