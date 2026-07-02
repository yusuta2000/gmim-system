import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Toggle user role between 'admin' and 'user' (admin only)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, requesterId } = body;

    if (!assistantId || !requesterId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    // Verify requester is admin
    const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Prevent self-demotion (admin can't remove own admin role)
    if (assistantId === requesterId) {
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

    return NextResponse.json({
      message: `${assistant.name} ${newRole === 'admin' ? 'temsilci yapıldı' : 'temsilciliği kaldırıldı'}`,
      newRole,
    });
  } catch (error) {
    console.error('Error toggling role:', error);
    return NextResponse.json({ error: 'Rol değiştirme hatası' }, { status: 500 });
  }
}
