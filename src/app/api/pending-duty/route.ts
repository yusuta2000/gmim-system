import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

// GET: List all pending duty changes (for admin approval view)
export async function GET(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);

    const changes = await db.pendingDutyChange.findMany({
      where: { status: 'pending', assistant: { department } },
      include: { assistant: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(changes);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching pending duty changes:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Submit a new duty change request (by user) or direct change (by admin)
export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { assistantId, changeType, dutyName, description, dutyId, isDirectAdmin } = body;

    if (!assistantId || !changeType || !dutyName) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);

    // If admin is making the change directly, apply it immediately
    if (isDirectAdmin) {
      requireRole(user, ['admin', 'dekan', 'baskan']);
      if (changeType === 'add') {
        await db.permanentDuty.create({
          data: { name: dutyName, description: description || null, assistantId },
        });
      } else if (changeType === 'edit' && dutyId) {
        await db.permanentDuty.update({
          where: { id: dutyId },
          data: { name: dutyName, description: description || null },
        });
      } else if (changeType === 'delete' && dutyId) {
        await db.permanentDuty.delete({ where: { id: dutyId } });
      }
      return NextResponse.json({ message: 'Daimi görev güncellendi', direct: true });
    }

    if (assistantId !== user.id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Regular user: create pending change request
    const change = await db.pendingDutyChange.create({
      data: {
        assistantId,
        changeType,
        dutyName,
        description: description || null,
        dutyId: dutyId || null,
        submittedBy: user.id,
        status: 'pending',
      },
    });

    // Notify managers of this department plus the faculty-wide dekan
    const managers = await db.researchAssistant.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['admin', 'baskan'] }, department: assistant.department },
          { role: 'dekan' },
        ],
      },
    });
    for (const manager of managers) {
      await db.notification.create({
        data: {
          title: 'Daimi Görev Değişikliği Onayı',
          message: `${assistant?.name} daimi görev değişikliği talep ediyor: ${changeType === 'add' ? 'Ekleme' : changeType === 'edit' ? 'Düzenleme' : 'Silme'} - "${dutyName}"`,
          type: 'task_pending',
          assistantId: manager.id,
        },
      });
    }

    return NextResponse.json({ message: 'Değişiklik talebi gönderildi, temsilci onayı bekleniyor', change });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error creating duty change:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT: Approve or reject a pending duty change
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { changeId, action } = body;

    if (!changeId || !action) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const change = await db.pendingDutyChange.findUnique({
      where: { id: changeId },
      include: { assistant: true },
    });
    if (!change) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, change.assistant.department as SessionUser['department']);

    if (action === 'approve') {
      // Apply the change
      if (change.changeType === 'add') {
        await db.permanentDuty.create({
          data: { name: change.dutyName, description: change.description, assistantId: change.assistantId },
        });
      } else if (change.changeType === 'edit' && change.dutyId) {
        await db.permanentDuty.update({
          where: { id: change.dutyId },
          data: { name: change.dutyName, description: change.description },
        });
      } else if (change.changeType === 'delete' && change.dutyId) {
        await db.permanentDuty.delete({ where: { id: change.dutyId } });
      }

      await db.pendingDutyChange.update({
        where: { id: changeId },
        data: { status: 'approved' },
      });

      // Notify the user
      await db.notification.create({
        data: {
          title: 'Daimi Görev Değişikliği Onaylandı',
          message: `"${change.dutyName}" için ${change.changeType === 'add' ? 'ekleme' : change.changeType === 'edit' ? 'düzenleme' : 'silme'} talebiniz onaylandı.`,
          type: 'success',
          assistantId: change.assistantId,
        },
      });

    } else if (action === 'reject') {
      await db.pendingDutyChange.update({
        where: { id: changeId },
        data: { status: 'rejected' },
      });

      await db.notification.create({
        data: {
          title: 'Daimi Görev Değişikliği Reddedildi',
          message: `"${change.dutyName}" için talebiniz reddedildi.`,
          type: 'warning',
          assistantId: change.assistantId,
        },
      });
    } else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }

    return NextResponse.json({ message: action === 'approve' ? 'Onaylandı' : 'Reddedildi' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error processing duty change:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
