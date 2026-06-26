import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({
      where: { email },
    });

    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    if (assistant.password !== password) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 401 });
    }

    // Return user info (without password)
    const { password: _, ...user } = assistant;

    return NextResponse.json({
      user,
      message: 'Giriş başarılı',
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Giriş hatası' }, { status: 500 });
  }
}
