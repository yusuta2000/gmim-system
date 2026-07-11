import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { sessionCookie } from '@/lib/auth/session';
import { createSessionToken, hashSessionToken } from '@/lib/auth/session-token';
import { sessionRepository } from '@/lib/auth/session-repository';

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, department } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({
      where: { email },
    });

    if (!assistant?.passwordHash || !(await verifyPassword(assistant.passwordHash, password))) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 });
    }

    // Department gate: users/temsilci/başkan may only sign in to their own department.
    // Dekan is faculty-wide and may sign in to either.
    if (department && assistant.role !== 'dekan' && assistant.department !== department) {
      return NextResponse.json({ error: 'Bu bölüme ait bir hesabınız yok. Lütfen doğru bölümü seçin.' }, { status: 403 });
    }

    // Return user info (without password)
    const { password: _, passwordHash: __, ...user } = assistant;
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await sessionRepository.createSession({
      userId: assistant.id,
      tokenHash: await hashSessionToken(token),
      expiresAt,
    });

    const response = NextResponse.json({
      user,
      message: 'Giriş başarılı',
    });
    response.cookies.set(sessionCookie(token, expiresAt));

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Giriş hatası' }, { status: 500 });
  }
}
