import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'
import { buildExamSupervisionReport } from '@/features/reports/exam-supervision-report'

// Reads (never writes) a department's supervision data and builds the check list.
export async function loadExamSupervisionReport(department: SessionUser['department']) {
  const [assistants, exams, categories, tasks] = await Promise.all([
    db.researchAssistant.findMany({ where: { department }, select: { id: true, name: true } }),
    db.exam.findMany({ where: { department }, select: { id: true, courseCode: true, courseName: true, day: true, timeSlot: true, classroom: true, notes: true } }),
    db.pointCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, points: true } }),
    db.task.findMany({
      where: { assistant: { department }, status: { in: ['approved', 'assigned', 'pending'] } },
      select: { id: true, number: true, assistantId: true, description: true, date: true, hoursWorked: true, points: true, status: true, notes: true, category: { select: { name: true } } },
    }),
  ])
  return buildExamSupervisionReport({ assistants, exams, categories, tasks })
}

// The fix plan page is personal: only this account (Y.Tarık MUTLU, GMİM temsilcisi) sees it.
const FIX_PLAN_OWNER_EMAIL = 'ymutlu@itu.edu.tr'

export async function isFixPlanOwner(userId: string) {
  const person = await db.researchAssistant.findUnique({ where: { id: userId }, select: { email: true } })
  return person?.email?.trim().toLowerCase() === FIX_PLAN_OWNER_EMAIL
}
