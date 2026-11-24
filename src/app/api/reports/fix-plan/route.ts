import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { buildFixPlan, FIX_PLAN_SINCE } from '@/features/reports/fix-plan'
import { isFixPlanOwner, loadExamSupervisionReport } from '@/features/reports/server/load-report'

// Personal, read-only fix plan; any other account gets 404 as if the page did not exist.
export async function GET() {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    if (!(await isFixPlanOwner(user.id))) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json(buildFixPlan(await loadExamSupervisionReport(user.department), FIX_PLAN_SINCE))
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('Error building fix plan:', error)
    return NextResponse.json({ error: 'Düzeltme planı oluşturulamadı' }, { status: 500 })
  }
}
