import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { respondToTask } from '@/features/tasks/server/task-service'
import { TaskServiceError, taskErrorStatus } from '@/features/tasks/server/errors'

export async function PUT(request: Request) {
  try {
    const user = await requireSession()
    const body = await request.json()
    const { taskId, action, rejectionReason } = body as { taskId?: string; action?: 'accept' | 'reject'; rejectionReason?: string }

    if (!taskId || !action) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 })
    }
    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Görevi reddetmek için bir sebep yazın' }, { status: 400 })
    }
    if (rejectionReason && rejectionReason.trim().length > 500) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Ret sebebi en fazla 500 karakter olabilir' }, { status: 400 })
    }

    await respondToTask({ taskId, action, rejectionReason, responder: user })

    return NextResponse.json({
      message: action === 'accept' ? 'Görev kabul edildi, puan eklendi' : 'Görev reddedildi',
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof TaskServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: taskErrorStatus(error) })
    }

    console.error('Error responding to task:', error)
    return NextResponse.json({ error: 'İşlem hatası' }, { status: 500 })
  }
}
