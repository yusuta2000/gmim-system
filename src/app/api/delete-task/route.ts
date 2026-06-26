import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    const requesterId = searchParams.get('requesterId');

    if (!taskId) {
      return NextResponse.json({ error: 'Görev ID gerekli' }, { status: 400 });
    }

    // Only admins can delete tasks
    if (requesterId) {
      const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
      if (!requester || requester.role !== 'admin') {
        return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
      }
    }

    // Find the task
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assistant: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 });
    }

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
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
