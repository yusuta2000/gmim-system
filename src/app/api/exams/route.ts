import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);
    const exams = await db.exam.findMany({
      where: { department },
      orderBy: { date: 'asc' },
      include: {
        supervisors: {
          include: {
            assistant: true,
          },
        },
      },
    });
    return NextResponse.json(exams);
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
    const { courseCode, courseName, instructor, date, day, timeSlot, requiredSupervisors, classroom, notes, department } = body;
    const dept = (department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, dept);

    const exam = await db.exam.create({
      data: {
        courseCode,
        courseName,
        instructor,
        date: new Date(date),
        day,
        timeSlot,
        department: dept,
        requiredSupervisors: requiredSupervisors || 1,
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

    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
