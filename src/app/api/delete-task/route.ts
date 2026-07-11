import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

export async function DELETE(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Görev ID gerekli' }, { status: 400 });
    }

    // Find the task
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assistant: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, task.assistant.department as SessionUser['department']);

    // If the task was approved, subtract its points from the assistant
    if (task.status === 'approved' && task.points > 0) {
      await db.researchAssistant.update({
        where: { id: task.assistantId },
        data: { totalPoints: { decrement: task.points } },
      });
    }

    // Delete the task
    await db.task.delete({ where: { id: taskId } });

    // Notify the assistant
    await db.notification.create({
      data: {
        title: 'Görev Silindi',
        message: `"${task.description}" göreviniz temsilci tarafından silindi. ${task.status === 'approved' ? `${task.points} puan düşürüldü.` : ''}`,
        type: 'warning',
        assistantId: task.assistantId,
        relatedId: null,
      },
    });

    return NextResponse.json({
      message: `"${task.description}" görevi silindi${task.status === 'approved' ? `, ${task.points} puan düşürüldü` : ''}`,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
