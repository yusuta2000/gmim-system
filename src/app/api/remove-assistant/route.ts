import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('id');
    const requesterId = searchParams.get('requesterId');

    if (!assistantId || !requesterId) {
      return NextResponse.json({ error: 'ID bilgileri gerekli' }, { status: 400 });
    }

    // Verify requester is admin
    const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const assistant = await db.researchAssistant.findUnique({
      where: { id: assistantId },
      include: { tasks: true, permanentDuties: true },
    });

    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    if (assistant.role === 'admin') {
      return NextResponse.json({ error: 'Temsilci hesabı silinemez' }, { status: 400 });
    }

    // Delete all related records first
    await db.notification.deleteMany({ where: { assistantId } });
    await db.pendingDutyChange.deleteMany({ where: { assistantId } });
    await db.permanentDuty.deleteMany({ where: { assistantId } });
    await db.weeklySchedule.deleteMany({ where: { assistantId } });
    await db.examSupervisor.deleteMany({ where: { assistantId } });
    await db.task.deleteMany({ where: { assistantId } });
    await db.researchAssistant.delete({ where: { id: assistantId } });

    return NextResponse.json({ message: `${assistant.name} sistemden kaldırıldı (${assistant.tasks.length} görev, ${assistant.permanentDuties.length} daimi görev de silindi)` });
  } catch (error) {
    console.error('Error removing assistant:', error);
    return NextResponse.json({ error: 'Araş gör kaldırma hatası' }, { status: 500 });
  }
}
