import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';

// Ar.gör accepts or rejects an assigned task
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { taskId, action } = body; // action: 'accept' or 'reject'

    if (!taskId || !action) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { assistant: true, category: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 });
    }

    // Only the assigned ar.gör can respond
    if (task.assistantId !== user.id) {
      return NextResponse.json({ error: 'Bu göreve yanıt verme yetkiniz yok' }, { status: 403 });
    }

    // Only "assigned" tasks can be accepted/rejected
    if (task.status !== 'assigned') {
      return NextResponse.json({ error: 'Bu görev zaten yanıtlanmış' }, { status: 400 });
    }

    if (action === 'accept') {
      // Mark as approved and add points
      await db.task.update({
        where: { id: taskId },
        data: { status: 'approved' },
      });

      if (task.points > 0) {
        await db.researchAssistant.update({
          where: { id: task.assistantId },
          data: { totalPoints: { increment: task.points } },
        });
      }

      // Notify managers of this task's department plus the faculty-wide dekan
      const managers = await db.researchAssistant.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { in: ['admin', 'baskan'] }, department: task.assistant.department },
            { role: 'dekan' },
          ],
        },
      });
      for (const m of managers) {
        await db.notification.create({
          data: {
            title: 'Görev Kabul Edildi',
            message: `${task.assistant?.name} "${task.description}" görevini kabul etti. ${task.points} puan eklendi.`,
            type: 'success',
            assistantId: m.id,
            relatedId: taskId,
          },
        });
      }

      return NextResponse.json({ message: 'Görev kabul edildi, puan eklendi' });
    }

    if (action === 'reject') {
      // Mark as rejected, no points added
      await db.task.update({
        where: { id: taskId },
        data: { status: 'rejected' },
      });

      // Notify managers of this task's department plus the faculty-wide dekan
      const managers = await db.researchAssistant.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { in: ['admin', 'baskan'] }, department: task.assistant.department },
            { role: 'dekan' },
          ],
        },
      });
      for (const m of managers) {
        await db.notification.create({
          data: {
            title: 'Görev Reddedildi',
            message: `${task.assistant?.name} "${task.description}" görevini reddetti. Başka bir araş görüye atanabilir.`,
            type: 'warning',
            assistantId: m.id,
            relatedId: taskId,
          },
        });
      }

      return NextResponse.json({ message: 'Görev reddedildi' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    console.error('Error responding to task:', error);
    return NextResponse.json({ error: 'İşlem hatası' }, { status: 500 });
  }
}
