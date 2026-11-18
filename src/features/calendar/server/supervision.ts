import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

// A supervision duty is an ExamSupervisor row plus an assigned task whose notes carry this marker.
// Points are added only when the assistant accepts the task; rejecting or deleting it frees the slot.
const EXAM_MARKER = '[SINAV] '

export function examMarker(examId: string) {
  return `${EXAM_MARKER}${examId}`
}

export function linkedExamId(notes: string | null) {
  return notes?.match(/\[SINAV\] (\S+)/)?.[1] ?? null
}

type SupervisionExam = { id: string; courseCode: string; courseName: string; date: Date; timeSlot: string }
type SupervisionAssistant = { id: string; name: string; email: string }

export async function addSupervisor(input: { exam: SupervisionExam; assistant: SupervisionAssistant; actorId: string }, client: Prisma.TransactionClient = db) {
  const { exam, assistant } = input
  await client.examSupervisor.create({ data: { examId: exam.id, assistantId: assistant.id } })

  const category = await client.pointCategory.findFirst({ where: { name: { contains: 'Gözetmenlik' } } })
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
