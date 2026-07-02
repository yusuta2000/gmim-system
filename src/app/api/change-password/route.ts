import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, currentPassword, newPassword } = body;

    if (!assistantId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Tüm alanlar gerekli' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalı' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    if (assistant.password !== currentPassword) {
      return NextResponse.json({ error: 'Mevcut şifre hatalı' }, { status: 401 });
    }

    await db.researchAssistant.update({
      where: { id: assistantId },
      data: { password: newPassword },
    });

    return NextResponse.json({ message: 'Şifreniz başarıyla değiştirildi' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Şifre değiştirme hatası' }, { status: 500 });
  }
}
