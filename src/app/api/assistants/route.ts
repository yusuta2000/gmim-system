import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'dekan' || user.role === 'baskan';
}

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);

    // Department-scoped: managers see the department's members. Dekan is faculty-wide,
    // so it appears in every department's management view. Users see only themselves.
    const where = isManager(user)
      ? { OR: [{ department }, { role: 'dekan' }] }
      : { id: user.id };
    const assistants = await db.researchAssistant.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        permanentDuties: {
          orderBy: { order: 'asc' },
        },
        pendingDutyChanges: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    // Strip password material from response for security
    const sanitized = assistants.map(({ password: _, passwordHash: __, ...rest }) => rest);
    return NextResponse.json(sanitized);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching assistants:', error);
    return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 });
  }
}
