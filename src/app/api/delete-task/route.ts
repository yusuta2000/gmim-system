import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { deleteTask } from '@/features/tasks/server/task-service'
import { TaskServiceError, taskErrorStatus } from '@/features/tasks/server/errors'

export async function DELETE(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json({ error: 'Görev ID gerekli' }, { status: 400 })
    }

    await deleteTask({ taskId, requester: user })

    return NextResponse.json({ message: 'Görev silindi' })
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

    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
