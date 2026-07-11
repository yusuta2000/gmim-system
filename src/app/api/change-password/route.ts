import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';

export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Tüm alanlar gerekli' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalı' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: user.id } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    if (!assistant.passwordHash || !(await verifyPassword(assistant.passwordHash, currentPassword))) {
      return NextResponse.json({ error: 'Mevcut şifre hatalı' }, { status: 401 });
    }

    await db.researchAssistant.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ message: 'Şifreniz başarıyla değiştirildi' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Şifre değiştirme hatası' }, { status: 500 });
  }
}
