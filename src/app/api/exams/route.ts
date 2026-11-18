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
      select: { assistantId: true, status: true, notes: true, assistant: { select: { id: true, name: true } } },
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
