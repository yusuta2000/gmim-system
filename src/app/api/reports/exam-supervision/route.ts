import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { departmentSchema } from '@/features/calendar/schemas'
import { loadExamSupervisionReport } from '@/features/reports/server/load-report'

// Read-only supervision check list for managers; nothing is written.
export async function GET(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const department = departmentSchema.parse(new URL(request.url).searchParams.get('department') || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)

    return NextResponse.json(await loadExamSupervisionReport(department))
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
