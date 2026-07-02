import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, isActive } = body;

    if (!assistantId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'assistantId ve isActive (boolean) gerekli' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Araş gör bulunamadı' }, { status: 404 });
    }

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

    return NextResponse.json({
      message: `${assistant.name} ${isActive ? 'aktif' : 'pasif'} yapıldı`,
      assistant: updated,
    });
  } catch (error) {
    console.error('Error toggling active status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
