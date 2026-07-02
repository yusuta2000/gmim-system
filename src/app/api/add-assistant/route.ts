import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, faculty, department, password, role, requesterId } = body;

    if (!name || !email || !requesterId) {
      return NextResponse.json({ error: 'Ad, e-posta ve istekci ID gerekli' }, { status: 400 });
    }

    // Verify requester is admin
    const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
    if (!requester || !['admin', 'dekan', 'baskan'].includes(requester.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Check if email already exists
    const existing = await db.researchAssistant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 409 });
    }

    // Get max order number
    const maxOrder = await db.researchAssistant.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const assistant = await db.researchAssistant.create({
      data: {
        name,
        email,
        phone: phone || null,
        faculty: faculty || 'DZ',
        department: department || 'GMI',
        password: password || email.split('@')[0] + '2026',
        role: role || 'user',
        order: (maxOrder?.order || 0) + 1,
        isActive: true,
        totalPoints: 0,
      },
    });

    // Notify all admins
    const admins = await db.researchAssistant.findMany({ where: { role: 'admin', isActive: true } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          title: 'Yeni Araş Gör Eklendi',
          message: `${name} sisteme eklendi. E-posta: ${email}`,
          type: 'info',
          assistantId: admin.id,
        },
      });
    }

    const { password: _, ...safe } = assistant;
    return NextResponse.json({ message: `${name} başarıyla eklendi`, assistant: safe }, { status: 201 });
  } catch (error) {
    console.error('Error adding assistant:', error);
    return NextResponse.json({ error: 'Araş gör ekleme hatası' }, { status: 500 });
  }
}
