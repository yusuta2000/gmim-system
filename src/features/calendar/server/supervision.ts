import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { courseCodes, examBaremOptions, isExamRelated, normalizeTr, type BaremCategory, type BaremExam } from '@/features/calendar/barem'

// A supervision duty is an ExamSupervisor row plus an assigned task whose notes carry this marker.
// Points are added only when the assistant accepts the task; rejecting or deleting it frees the slot.
const EXAM_MARKER = '[SINAV] '

export function examMarker(examId: string) {
  return `${EXAM_MARKER}${examId}`
}

export function linkedExamId(notes: string | null) {
  return notes?.match(/\[SINAV\] (\S+)/)?.[1] ?? null
}

type SupervisionExam = { id: string; courseCode: string; courseName: string; date: Date; day: string; timeSlot: string }
type SupervisionAssistant = { id: string; name: string; email: string }

// The barem category the manager chose; without a choice, the best fit for the exam's day/time (never just the first match).
export async function resolveExamCategory(exam: BaremExam, categoryId?: string | null): Promise<BaremCategory | null> {
  const categories = await db.pointCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, points: true } })
  if (categoryId) return categories.find((category) => category.id === categoryId) ?? null
  return examBaremOptions(categories, exam).options[0] ?? null
}

export type SameDayDuty = { assistantId: string; description: string; hoursWorked: string | null; sameCourse: boolean }

// Exam duties the given people already have on the exam's date (pending or accepted), so a manager can be warned.
export async function sameDayExamDuties(exam: { date: Date; courseCode: string }, assistantIds: string[]): Promise<SameDayDuty[]> {
  if (!assistantIds.length) return []
  const dayStart = new Date(exam.date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const tasks = await db.task.findMany({
    where: { assistantId: { in: assistantIds }, status: { not: 'rejected' }, date: { gte: dayStart, lt: dayEnd } },
    select: { assistantId: true, description: true, hoursWorked: true, notes: true, category: { select: { name: true } } },
  })
  const code = normalizeTr(exam.courseCode).replace(/\s+/g, '')
  return (tasks ?? [])
    .filter((task) => linkedExamId(task.notes) || isExamRelated(task.description) || isExamRelated(task.category?.name))
    .map((task) => ({
      assistantId: task.assistantId,
      description: task.description,
      hoursWorked: task.hoursWorked,
      sameCourse: code.length >= 3 && (courseCodes(task.description).includes(code) || normalizeTr(task.description).replace(/\s+/g, '').includes(code)),
    }))
}

export async function addSupervisor(input: { exam: SupervisionExam; assistant: SupervisionAssistant; actorId: string; category: BaremCategory | null }, client: Prisma.TransactionClient = db) {
  const { exam, assistant, category } = input
  await client.examSupervisor.create({ data: { examId: exam.id, assistantId: assistant.id } })
  const maxTask = await client.task.findFirst({
    where: { assistantId: assistant.id },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  await client.task.create({
    data: {
      number: (maxTask?.number || 0) + 1,
      description: `Gözetmenlik: ${exam.courseCode} - ${exam.courseName}`,
      hoursWorked: exam.timeSlot,
      date: exam.date,
      points: category?.points || 4,
      status: 'assigned',
      source: 'auto_assigned',
      assignedBy: input.actorId,
      notes: examMarker(exam.id),
      assistantId: assistant.id,
      categoryId: category?.id || null,
    },
  })

  const message = `${exam.courseCode} - ${exam.courseName} sınavına gözetmen olarak atandınız. Tarih: ${new Date(exam.date).toLocaleDateString('tr-TR')}, Saat: ${exam.timeSlot}`
  await client.notification.create({
    data: {
      title: 'Gözetmenlik Ataması - Yanıt Bekleniyor',
      message: `${message}. Görevler ekranından kabul edin veya reddedin.`,
      type: 'exam_assigned',
      assistantId: assistant.id,
      relatedId: exam.id,
    },
  })
  return message
}

export function mailSupervisor(assistant: SupervisionAssistant, message: string) {
  return sendEmail(
    assistant.email,
    'Gözetmenlik Ataması',
    `Merhaba ${assistant.name},\n\n${message}\n\nPortalda Görevler ekranından kabul edin veya reddedin. Kabul ettiğinizde puanınız eklenir.`,
  )
}
