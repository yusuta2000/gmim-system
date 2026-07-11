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
    const assistantId = searchParams.get('id');

    if (!assistantId) {
      return NextResponse.json({ error: 'ID bilgileri gerekli' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({
      where: { id: assistantId },
      include: { tasks: true, permanentDuties: true },
    });

    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    if (assistant.role === 'admin' || assistant.role === 'dekan' || assistant.role === 'baskan') {
      return NextResponse.json({ error: 'Temsilci, Dekan ve Bölüm Başkanı hesapları silinemez' }, { status: 400 });
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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error removing assistant:', error);
    return NextResponse.json({ error: 'Araş gör kaldırma hatası' }, { status: 500 });
  }
}
