import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import { addSupervisor, mailSupervisor } from '@/features/calendar/server/supervision';

const bodySchema = z.object({ examId: z.string().min(1), assistantId: z.string().min(1) });

// Manager picks a specific supervisor for an exam; the duty waits for that person's acceptance.
export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Sınav ve kişi seçin' }, { status: 400 });
    }

    const exam = await db.exam.findUnique({ where: { id: parsed.data.examId }, include: { supervisors: true } });
    if (!exam) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Sınav bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, exam.department as SessionUser['department']);

    const assistant = await db.researchAssistant.findUnique({ where: { id: parsed.data.assistantId } });
    if (!assistant || !assistant.isActive || !['user', 'admin'].includes(assistant.role) || assistant.department !== exam.department) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Bu kişi bu sınava gözetmen olarak eklenemez' }, { status: 400 });
    }
    if (exam.supervisors.some((supervisor) => supervisor.assistantId === assistant.id)) {
      return NextResponse.json({ error: 'CONFLICT', message: `${assistant.name} zaten bu sınavın gözetmeni` }, { status: 409 });
    }

    const message = await addSupervisor({ exam, assistant, actorId: user.id });
    await mailSupervisor(assistant, message);
    return NextResponse.json({ message: `${assistant.name} gözetmen olarak eklendi; kabul etmesi bekleniyor` }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    console.error('Error adding supervisor:', error);
    return NextResponse.json({ error: 'Gözetmen eklenemedi' }, { status: 500 });
  }
}
