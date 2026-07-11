import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import {
  PeriodServiceError,
  periodErrorStatus,
  resetPeriod,
} from '@/features/periods/server/period-service';

function isMissingPeriodStorage(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === 'P2021'
    || candidate?.code === 'P2022'
    || /AcademicPeriod|does not exist|column .* does not exist/i.test(candidate?.message ?? '');
}

async function legacyResetPeriod(input: {
  action: 'reset' | 'archive';
  department: SessionUser['department'];
  carryOverPoints?: Record<string, number>;
}) {
  if (input.action === 'reset') {
    await db.researchAssistant.updateMany({
      where: { department: input.department },
      data: { totalPoints: 0 },
    });
    return { action: input.action };
  }

  if (input.carryOverPoints && typeof input.carryOverPoints === 'object') {
    for (const [assistantId, points] of Object.entries(input.carryOverPoints)) {
      await db.researchAssistant.updateMany({
        where: { id: assistantId, department: input.department },
        data: { totalPoints: points },
      });
    }
  }
  return { action: input.action };
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { action, carryOverPoints, department } = body;
    const dept = (department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, dept);

    if (action !== 'reset' && action !== 'archive') {
      return NextResponse.json({ error: 'Invalid action. Use "reset" or "archive"' }, { status: 400 });
    }

    try {
      await resetPeriod({
        action,
        department: dept,
        requester: user,
        carryOverPoints,
      });
    } catch (error) {
      if (!isMissingPeriodStorage(error)) throw error;
      await legacyResetPeriod({ action, department: dept, carryOverPoints });
    }

    return NextResponse.json({
      message: action === 'reset'
        ? 'Tüm puanlar sıfırlandı. Yeni dönem başladı!'
        : 'Puanlar taşındı. Yeni dönem başladı!',
      action,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof PeriodServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: periodErrorStatus(error) });
    }

    console.error('Error resetting period:', error);
    return NextResponse.json({ error: 'Failed to reset period' }, { status: 500 });
  }
}
