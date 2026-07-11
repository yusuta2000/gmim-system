import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { approveTask } from '@/features/tasks/server/task-service'
import { TaskServiceError, taskErrorStatus } from '@/features/tasks/server/errors'

export async function PUT(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const body = await request.json()
    const { taskId, action } = body as { taskId?: string; action?: 'approve' | 'reject' }

    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 })
    }

    const task = await approveTask({ taskId, action, reviewer: user })

    return NextResponse.json({
      message: action === 'approve' ? 'Görev onaylandı' : 'Görev reddedildi',
      task,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }
    if (error instanceof TaskServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: taskErrorStatus(error) })
    }

    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const { searchParams } = new URL(request.url)
    const department = (searchParams.get('department') || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)
    const pendingTasks = await db.task.findMany({
      where: { status: 'pending', assistant: { department } },
      orderBy: { createdAt: 'desc' },
      include: { assistant: true, category: true },
    })
    return NextResponse.json(pendingTasks)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }

    console.error('Error fetching pending tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 })
  }
}
