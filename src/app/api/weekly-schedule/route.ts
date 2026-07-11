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
    const schedules = await db.weeklySchedule.findMany({
      where: { assistant: { department } },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
      include: { assistant: true },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching weekly schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { assistantId, dayOfWeek, timeSlot, description } = body;

    if (!assistantId || !dayOfWeek || !timeSlot || !description) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    // Check for conflicts
    const conflicts = await checkScheduleConflicts(assistantId, dayOfWeek, timeSlot);
    if (conflicts.length > 0) {
      return NextResponse.json({
        error: 'Zaman çakışması tespit edildi',
        conflicts,
      }, { status: 409 });
    }

    const schedule = await db.weeklySchedule.create({
      data: { assistantId, dayOfWeek, timeSlot, description },
      include: { assistant: true },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const schedule = await db.weeklySchedule.findUnique({
      where: { id },
      include: { assistant: true },
    });
    if (!schedule) {
      return NextResponse.json({ error: 'Program bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, schedule.assistant.department as SessionUser['department']);

    await db.weeklySchedule.delete({ where: { id } });
    return NextResponse.json({ message: 'Schedule deleted' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}

// Helper: Check for schedule conflicts
async function checkScheduleConflicts(assistantId: string, dayOfWeek: number, timeSlot: string) {
  const existingSchedules = await db.weeklySchedule.findMany({
    where: { assistantId, dayOfWeek },
  });

  const conflicts: typeof existingSchedules = [];
  const [newStart, newEnd] = parseTimeSlot(timeSlot);

  if (newStart !== null && newEnd !== null) {
    for (const sched of existingSchedules) {
      const [existStart, existEnd] = parseTimeSlot(sched.timeSlot);
      if (existStart !== null && existEnd !== null) {
        if (newStart < existEnd && newEnd > existStart) {
          conflicts.push(sched);
        }
      }
    }
  }

  return conflicts;
}

function parseTimeSlot(timeSlot: string): [number | null, number | null] {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return [null, null];
  const start = parseInt(match[1]) * 60 + parseInt(match[2]);
  const end = parseInt(match[3]) * 60 + parseInt(match[4]);
  return [start, end];
}
