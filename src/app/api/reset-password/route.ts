import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Admin resets a user's password
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, newPassword, requesterId } = body;

    if (!assistantId || !newPassword || !requesterId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalı' }, { status: 400 });
    }

    // Verify requester is admin
    const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
    if (!requester || !['admin', 'dekan', 'baskan'].includes(requester.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    await db.researchAssistant.update({
      where: { id: assistantId },
      data: { password: newPassword },
    });

    // Notify the user
    await db.notification.create({
      data: {
        title: 'Şifreniz Sıfırlandı',
        message: `Şifreniz temsilci tarafından sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.`,
        type: 'warning',
        assistantId,
      },
    });

    return NextResponse.json({ message: `${assistant.name} adlı kullanıcının şifresi sıfırlandı` });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Şifre sıfırlama hatası' }, { status: 500 });
  }
}
