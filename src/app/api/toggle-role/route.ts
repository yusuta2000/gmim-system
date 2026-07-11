import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

// Toggle user role between 'admin' and 'user' (admin only)
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { assistantId } = body;

    if (!assistantId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    // Dekan ve Bölüm Başkanı rolü değiştirilemez
    if (assistant.role === 'dekan' || assistant.role === 'baskan') {
      return NextResponse.json({ error: 'Dekan ve Bölüm Başkanı rolü değiştirilemez' }, { status: 400 });
    }

    // Prevent self-demotion (admin can't remove own admin role)
    if (assistantId === user.id) {
      return NextResponse.json({ error: 'Kendi temsilci rolünüzü kaldıramazsınız' }, { status: 400 });
    }

    const newRole = assistant.role === 'admin' ? 'user' : 'admin';

    const updated = await db.researchAssistant.update({
      where: { id: assistantId },
      data: { role: newRole },
    });

    // Notify the user
    await db.notification.create({
      data: {
        title: newRole === 'admin' ? 'Temsilci Rolü Verildi' : 'Temsilci Rolü Kaldırıldı',
        message: newRole === 'admin'
          ? 'Size temsilci (admin) rolü verildi. Artık tüm yönetim özelliklerine erişebilirsiniz.'
          : 'Temsilci rolünüz kaldırıldı. Artık araş gör olarak sisteme erişiyorsunuz.',
        type: newRole === 'admin' ? 'success' : 'info',
        assistantId,
      },
    });

    const { password: _, passwordHash: __, ...safeAssistant } = updated;
    return NextResponse.json({
      message: `${assistant.name} ${newRole === 'admin' ? 'temsilci yapıldı' : 'temsilciliği kaldırıldı'}`,
      newRole,
      assistant: safeAssistant,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error toggling role:', error);
    return NextResponse.json({ error: 'Rol değiştirme hatası' }, { status: 500 });
  }
}
