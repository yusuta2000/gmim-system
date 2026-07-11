import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { assistantId, isActive } = body;

    if (!assistantId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'assistantId ve isActive (boolean) gerekli' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Araş gör bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    const updated = await db.researchAssistant.update({
      where: { id: assistantId },
      data: { isActive },
    });

    await db.notification.create({
      data: {
        title: isActive ? 'Hesap Aktifleştirildi' : 'Hesap Pasifleştirildi',
        message: isActive
          ? 'Hesabınız aktifleştirildi. Sisteme giriş yapabilirsiniz.'
          : 'Hesabınız pasifleştirildi. Sisteme giriş yapamazsınız.',
        type: isActive ? 'success' : 'warning',
        assistantId,
      },
    });

    const { password: _, passwordHash: __, ...safeAssistant } = updated;
    return NextResponse.json({
      message: `${assistant.name} ${isActive ? 'aktif' : 'pasif'} yapıldı`,
      assistant: safeAssistant,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error toggling active status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
