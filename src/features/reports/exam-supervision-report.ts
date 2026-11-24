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
}
export type ReportGroup = { assistantName: string; day: string; tasks: ReportTask[] }
export type ReportMismatch = {
  assistantName: string
  day: string
  task: ReportTask
  exam: { courseCode: string; courseName: string; day: string; timeSlot: string }
  suggested: { name: string; points: number }
}
export type ExamSupervisionReport = {
  checkedTasks: number
  duplicates: ReportGroup[]
  sameDay: ReportGroup[]
  mismatches: ReportMismatch[]
}

const examIdOf = (notes: string | null) => notes?.match(/\[SINAV\] (\S+)/)?.[1] ?? null
const dayKey = (date: Date) => date.toISOString().slice(0, 10)

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
  for (const [key, items] of groups) {
    if (items.length < 2) continue
    const [assistantId, day] = key.split('|')
    const seen = new Set<string>()
    let duplicate = false
    for (const task of items) {
      for (const code of codesOf(task)) {
        if (seen.has(code)) duplicate = true
        seen.add(code)
      }
    }
    ;(duplicate ? duplicates : sameDay).push({ assistantName: names.get(assistantId) ?? assistantId, day, tasks: items.map(view) })
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
        suggested: { name: suggested.name, points: suggested.points },
      })
    }
  }

  const byDay = <T extends { day: string; assistantName: string }>(rows: T[]) =>
    rows.sort((a, b) => b.day.localeCompare(a.day) || a.assistantName.localeCompare(b.assistantName, 'tr'))
  return { checkedTasks: tasks.length, duplicates: byDay(duplicates), sameDay: byDay(sameDay), mismatches: byDay(mismatches) }
}
