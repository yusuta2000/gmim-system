import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { buildFixPlan, FIX_PLAN_SINCE } from '@/features/reports/fix-plan'
import { isFixPlanOwner, loadExamSupervisionReport } from '@/features/reports/server/load-report'
import { correctTaskPoints, deleteTask } from '@/features/tasks/server/task-service'
import { TaskServiceError } from '@/features/tasks/server/errors'

const bodySchema = z.object({ taskIds: z.array(z.string().min(1)).min(1).max(300) })

// Applies the selected fix plan rows. The plan is recomputed here, so only rows that are still wrong are changed.
export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    if (!(await isFixPlanOwner(user.id))) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Düzeltilecek kayıt seçin' }, { status: 400 })
    }

    const plan = buildFixPlan(await loadExamSupervisionReport(user.department), FIX_PLAN_SINCE)
    const selected = new Set(parsed.data.taskIds)
    const applied: string[] = []
    const skipped: { taskId: string; reason: string }[] = []

    for (const taskId of selected) {
      const action = plan.actions.find((item) => item.taskId === taskId)
      if (!action) {
        skipped.push({ taskId, reason: 'Artık listede yok' })
        continue
      }
      try {
        if (action.fix.type === 'delete') {
          await deleteTask({ taskId, requester: user })
        } else {
          await correctTaskPoints({ taskId, requester: user, ...action.fix })
        }
        applied.push(taskId)
      } catch (error) {
        if (!(error instanceof TaskServiceError)) throw error
        skipped.push({ taskId, reason: error.message })
      }
    }

    return NextResponse.json({
      applied,
      skipped,
      message: `${applied.length} kayıt düzeltildi${skipped.length ? `, ${skipped.length} kayıt atlandı` : ''}.`,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    console.error('Error applying fix plan:', error)
    return NextResponse.json({ error: 'Düzeltmeler uygulanamadı' }, { status: 500 })
  }
}
