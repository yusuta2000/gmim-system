import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

// Approve or reject a pending task
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { taskId, action } = body; // action: 'approve' or 'reject'

    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assistant: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, task.assistant.department as SessionUser['department']);

    if (task.status !== 'pending') {
      return NextResponse.json({ error: 'Bu görev zaten işlenmiş' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        assignedBy: user.id,
      },
      include: { assistant: true, category: true },
    });

    // If approved, add points to assistant
    if (action === 'approve' && task.points > 0) {
      await db.researchAssistant.update({
        where: { id: task.assistantId },
        data: { totalPoints: { increment: task.points } },
      });
    }

    // Create notification for the assistant
    await db.notification.create({
      data: {
        title: action === 'approve' ? 'Görev Onaylandı' : 'Görev Reddedildi',
        message: action === 'approve'
          ? `"${task.description}" göreviniz onaylandı. +${task.points} puan eklendi.`
          : `"${task.description}" göreviniz reddedildi. İçerik: ${task.assistant.name}`,
        type: action === 'approve' ? 'success' : 'warning',
        assistantId: task.assistantId,
        relatedId: task.id,
      },
    });

    return NextResponse.json({
      message: action === 'approve' ? 'Görev onaylandı' : 'Görev reddedildi',
      task: updatedTask,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// Get pending tasks (for temsilci dashboard)
export async function GET(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);
    const pendingTasks = await db.task.findMany({
      where: { status: 'pending', assistant: { department } },
      orderBy: { createdAt: 'desc' },
      include: { assistant: true, category: true },
    });
    return NextResponse.json(pendingTasks);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching pending tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 });
  }
}
