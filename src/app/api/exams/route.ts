import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import { z } from 'zod';
import { createExamSchema, departmentSchema } from '@/features/calendar/schemas';
import { examMarker, linkedExamId } from '@/features/calendar/server/supervision';

const examSelect = {
  id: true,
  courseCode: true,
  courseName: true,
  instructor: true,
  date: true,
  day: true,
  timeSlot: true,
  classroom: true,
  requiredSupervisors: true,
  notes: true,
  supervisors: {
    select: {
      id: true,
      assistantId: true,
      assistant: { select: { id: true, name: true } },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const department = departmentSchema.parse(searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);
    const exams = await db.exam.findMany({
      where: { department },
      orderBy: { date: 'asc' },
      select: examSelect,
    });
    // Supervision tasks tell whether each supervisor accepted; duties from before acceptance existed count as accepted.
    const tasks = exams.length ? await db.task.findMany({
      where: { source: 'auto_assigned', OR: exams.map((exam) => ({ notes: { startsWith: examMarker(exam.id) } })) },
      select: { assistantId: true, status: true, notes: true, categoryId: true, assistant: { select: { id: true, name: true } } },
    }) : [];
    return NextResponse.json(exams.map((exam) => {
      const examTasks = tasks.filter((task) => linkedExamId(task.notes) === exam.id);
      const supervisorIds = exam.supervisors.map((supervisor) => supervisor.assistantId);
      return {
        ...exam,
        supervisors: exam.supervisors.map((supervisor) => ({
          ...supervisor,
          status: examTasks.some((task) => task.assistantId === supervisor.assistantId && task.status === 'assigned') ? 'pending' : 'accepted',
        })),
        declined: examTasks
          .filter((task) => task.status === 'rejected' && !supervisorIds.includes(task.assistantId))
          .map((task) => task.assistant),
        // Barem already used for this exam's supervisors, so the next assignment defaults to the same one.
        categoryId: examTasks.find((task) => task.status !== 'rejected' && task.categoryId)?.categoryId ?? null,
      };
    }));
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const requestedDepartment = departmentSchema.parse(body.department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, requestedDepartment);
    const { courseCode, courseName, instructor, date, day, timeSlot, requiredSupervisors, classroom, notes, department } = createExamSchema.parse(body);
    const dept = (department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, dept);

    const exam = await db.exam.create({
      data: {
        courseCode,
        courseName,
        instructor,
        date,
        day,
        timeSlot,
        department: dept,
        requiredSupervisors,
        classroom: classroom || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'BAD_REQUEST', issues: error.issues }, { status: 400 });
    }

    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}

// Deleting an exam removes pending supervision duties (no points were given yet) but keeps accepted ones and their points.
export async function DELETE(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Sınav seçin' }, { status: 400 });
    }
    const exam = await db.exam.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Sınav bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, exam.department as SessionUser['department']);

    const result = await db.$transaction(async (tx) => {
      const tasks = await tx.task.findMany({
        where: { source: 'auto_assigned', notes: { startsWith: examMarker(exam.id) } },
        select: { id: true, assistantId: true, status: true, notes: true },
      });
      const linked = tasks.filter((task) => linkedExamId(task.notes) === exam.id);
      const pending = linked.filter((task) => task.status === 'assigned');
      if (pending.length) {
        await tx.task.deleteMany({ where: { id: { in: pending.map((task) => task.id) }, status: 'assigned' } });
        await tx.notification.createMany({
          data: pending.map((task) => ({
            title: 'Gözetmenlik İptal Edildi',
            message: `${exam.courseCode} - ${exam.courseName} sınavı takvimden silindi; bekleyen gözetmenlik göreviniz kaldırıldı.`,
            type: 'warning',
            assistantId: task.assistantId,
            relatedId: null,
          })),
        });
      }
      await tx.examSupervisor.deleteMany({ where: { examId: exam.id } });
      await tx.exam.delete({ where: { id: exam.id } });
      return { removedPending: pending.length, keptAccepted: linked.filter((task) => task.status === 'approved').length };
    });

    return NextResponse.json({
      ...result,
      message: `Sınav silindi. ${result.removedPending} bekleyen görev kaldırıldı${result.keptAccepted ? `, ${result.keptAccepted} kabul edilmiş görev ve puanı korundu` : ''}.`,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: 'Sınav silinemedi' }, { status: 500 });
  }
}
