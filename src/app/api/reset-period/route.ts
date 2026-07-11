import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { PeriodServiceError, periodErrorStatus, resetPeriod } from '@/features/periods/server/period-service'

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const body = await request.json()
    const { action, carryOverPoints, department } = body as {
      action?: 'reset' | 'archive'
      carryOverPoints?: Record<string, number>
      department?: SessionUser['department']
    }
    const dept = (department || user.department) as SessionUser['department']
    assertDepartmentAccess(user, dept)

    if (!action || !['reset', 'archive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "reset" or "archive"' }, { status: 400 })
    }

    await resetPeriod({ action, carryOverPoints, department: dept, requester: user })

    return NextResponse.json({
      message: action === 'reset'
        ? 'Tüm puanlar sıfırlandı. Yeni dönem başladı!'
        : 'Puanlar taşındı. Yeni dönem başladı!',
      action,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }
    if (error instanceof PeriodServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: periodErrorStatus(error) })
    }

    console.error('Error resetting period:', error)
    return NextResponse.json({ error: 'Failed to reset period' }, { status: 500 })
  }
}
