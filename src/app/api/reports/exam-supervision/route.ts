import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { departmentSchema } from '@/features/calendar/schemas'
import { buildExamSupervisionReport } from '@/features/reports/exam-supervision-report'

// Read-only supervision check list for managers; nothing is written.
export async function GET(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const department = departmentSchema.parse(new URL(request.url).searchParams.get('department') || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)

    const [assistants, exams, categories, tasks] = await Promise.all([
      db.researchAssistant.findMany({ where: { department }, select: { id: true, name: true } }),
      db.exam.findMany({ where: { department }, select: { id: true, courseCode: true, courseName: true, day: true, timeSlot: true, classroom: true, notes: true } }),
      db.pointCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, points: true } }),
      db.task.findMany({
        where: { assistant: { department }, status: { in: ['approved', 'assigned', 'pending'] } },
        select: { id: true, number: true, assistantId: true, description: true, date: true, hoursWorked: true, points: true, status: true, notes: true, category: { select: { name: true } } },
      }),
    ])
    return NextResponse.json(buildExamSupervisionReport({ assistants, exams, categories, tasks }))
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }
    console.error('Error building exam supervision report:', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}
