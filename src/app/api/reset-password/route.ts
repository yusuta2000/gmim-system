import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

// Admin resets a user's password
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { assistantId, newPassword } = body;

    if (!assistantId || !newPassword) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalı' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    await db.researchAssistant.update({
      where: { id: assistantId },
      data: { passwordHash: await hashPassword(newPassword) },
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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Şifre sıfırlama hatası' }, { status: 500 });
  }
}
