import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addSupervisor, examMarker, mailSupervisor, resolveExamCategory, sameDayExamDuties } from '@/features/calendar/server/supervision';
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
    const { examId, categoryId } = body;

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 });
    }

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { supervisors: true },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Sınav bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, exam.department as SessionUser['department']);

    const needed = exam.requiredSupervisors - exam.supervisors.length;
    if (needed <= 0) {
      return NextResponse.json({ message: 'Bu sınav için yeterli gözetmen zaten atanmış', exam }, { status: 200 });
    }

    // Get eligible assistants (ar.gör + temsilci) of the exam's department, lowest points first.
    // Dekan/başkan are excluded - they are not supervised staff.
    const assistants = await db.researchAssistant.findMany({
      where: { isActive: true, department: exam.department, role: { in: ['user', 'admin'] } },
      orderBy: { totalPoints: 'asc' },
    });

    const existingSupervisorIds = exam.supervisors.map(s => s.assistantId);
    // People who already declined this exam are not picked again automatically.
    const declined = await db.task.findMany({
      where: { source: 'auto_assigned', status: 'rejected', notes: { startsWith: examMarker(exam.id) } },
      select: { assistantId: true },
    });
    const declinedIds = declined.map(d => d.assistantId);
    const availableAssistants = assistants.filter(a => !existingSupervisorIds.includes(a.id) && !declinedIds.includes(a.id));

    // Check weekly schedule conflicts
    const dayMap: Record<string, number> = {
      'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 7,
    };
    const examDayNum = dayMap[exam.day] || 0;
    const [examStart, examEnd] = parseTimeSlot(exam.timeSlot);

    const eligibleAssistants: typeof assistants = [];
    for (const assistant of availableAssistants) {
      if (examStart !== null && examEnd !== null && examDayNum > 0) {
        const schedules = await db.weeklySchedule.findMany({
          where: { assistantId: assistant.id, dayOfWeek: examDayNum },
        });
        let hasConflict = false;
        for (const sched of schedules) {
          const [sStart, sEnd] = parseTimeSlot(sched.timeSlot);
          if (sStart !== null && sEnd !== null) {
            if (examStart < sEnd && examEnd > sStart) {
              hasConflict = true;
              break;
            }
          }
        }
        if (!hasConflict) {
          eligibleAssistants.push(assistant);
        }
      } else {
        eligibleAssistants.push(assistant);
      }
    }

    // Skip people who already hold this course or an overlapping exam that day; others may take a second exam.
    const duties = await sameDayExamDuties(exam, eligibleAssistants.map((assistant) => assistant.id));
    const blocked = new Set(duties
      .filter((duty) => {
        const [dStart, dEnd] = parseTimeSlot(duty.hoursWorked || '');
        return duty.sameCourse || (examStart !== null && examEnd !== null && dStart !== null && dEnd !== null && examStart < dEnd && examEnd > dStart);
      })
      .map((duty) => duty.assistantId));
    const toAssign = eligibleAssistants.filter((assistant) => !blocked.has(assistant.id)).slice(0, needed);

    if (toAssign.length === 0) {
      return NextResponse.json({
        message: 'Uygun araş gör bulunamadı. Tüm araş görlerin programında çakışma var.',
        assigned: 0,
      }, { status: 200 });
    }

    const category = await resolveExamCategory(exam, categoryId);
    if (categoryId && !category) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Seçilen barem bulunamadı' }, { status: 400 });
    }
    const secondExam = toAssign.filter((assistant) => duties.some((duty) => duty.assistantId === assistant.id)).map((assistant) => assistant.name);

    const assignments: { assistantId: string; name: string }[] = [];
    for (const assistant of toAssign) {
      const message = await addSupervisor({ exam, assistant, actorId: user.id, category });
      await mailSupervisor(assistant, message);
      assignments.push({ assistantId: assistant.id, name: assistant.name });
    }

    const updatedExam = await db.exam.findUnique({
      where: { id: examId },
      include: { supervisors: { include: { assistant: true } } },
    });

    return NextResponse.json({
      message: `${assignments.length} gözetmen atandı; kabul etmeleri bekleniyor${secondExam.length ? `. Bu gün başka sınavı da olanlar: ${secondExam.join(', ')}` : ''}`,
      assignments,
      exam: updatedExam,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error assigning supervisors:', error);
    return NextResponse.json({ error: 'Failed to assign supervisors' }, { status: 500 });
  }
}

function parseTimeSlot(timeSlot: string): [number | null, number | null] {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return [null, null];
  const start = parseInt(match[1]) * 60 + parseInt(match[2]);
  const end = parseInt(match[3]) * 60 + parseInt(match[4]);
  return [start, end];
}
