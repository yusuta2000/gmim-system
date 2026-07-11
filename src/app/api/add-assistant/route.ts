import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { name, email, phone, faculty, department, password, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Ad ve e-posta gerekli' }, { status: 400 });
    }

    const dept = (department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, dept);

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

    // Calculate average points for new ar.gör
    // New ar.gör gets the arithmetic average of the SAME department's active ar.görs' points
    // (admin + user roles). This prevents unfair disadvantage for newly joining ar.görs.
    let initialPoints = 0;
    const userRole = role === 'admin' ? 'admin' : 'user';
    if (userRole === 'user') {
      const existingArGors = await db.researchAssistant.findMany({
        where: { role: { in: ['admin', 'user'] }, isActive: true, department: dept },
        select: { totalPoints: true },
      });
      if (existingArGors.length > 0) {
        const sum = existingArGors.reduce((acc, a) => acc + a.totalPoints, 0);
        initialPoints = Math.round(sum / existingArGors.length);
      }
    }

    const initialPassword = password || email.split('@')[0] + '2026';
    const assistant = await db.researchAssistant.create({
      data: {
        name,
        email,
        phone: phone || null,
        faculty: faculty || 'DZ',
        department: dept,
        passwordHash: await hashPassword(initialPassword),
        role: userRole,
        order: (maxOrder?.order || 0) + 1,
        isActive: true,
        totalPoints: initialPoints,
      },
    });

    // Notify managers of this department (admin/baskan) plus the faculty-wide dekan
    const managers = await db.researchAssistant.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['admin', 'baskan'] }, department: dept },
          { role: 'dekan' },
        ],
      },
    });
    for (const m of managers) {
      await db.notification.create({
        data: {
          title: 'Yeni Araş Gör Eklendi',
          message: `${name} sisteme eklendi. E-posta: ${email}${initialPoints > 0 ? ` · Başlangıç puanı: ${initialPoints} (ortalama)` : ''}`,
          type: 'info',
          assistantId: m.id,
        },
      });
    }

    const { password: _, passwordHash: __, ...safe } = assistant;
    return NextResponse.json({ message: `${name} başarıyla eklendi`, assistant: safe }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error adding assistant:', error);
    return NextResponse.json({ error: 'Araş gör ekleme hatası' }, { status: 500 });
  }
}
