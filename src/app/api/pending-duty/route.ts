import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List all pending duty changes (for admin approval view)
export async function GET() {
  try {
    const changes = await db.pendingDutyChange.findMany({
      where: { status: 'pending' },
      include: { assistant: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(changes);
  } catch (error) {
    console.error('Error fetching pending duty changes:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Submit a new duty change request (by user) or direct change (by admin)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, changeType, dutyName, description, dutyId, submittedBy, isDirectAdmin } = body;

    if (!assistantId || !changeType || !dutyName) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    // If admin is making the change directly, apply it immediately
    if (isDirectAdmin) {
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

    // Regular user: create pending change request
    const change = await db.pendingDutyChange.create({
      data: {
        assistantId,
        changeType,
        dutyName,
        description: description || null,
        dutyId: dutyId || null,
        submittedBy: submittedBy || null,
        status: 'pending',
      },
    });

    // Notify admins
    const admins = await db.researchAssistant.findMany({ where: { role: 'admin', isActive: true } });
    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          title: 'Daimi Görev Değişikliği Onayı',
          message: `${assistant?.name} daimi görev değişikliği talep ediyor: ${changeType === 'add' ? 'Ekleme' : changeType === 'edit' ? 'Düzenleme' : 'Silme'} - "${dutyName}"`,
          type: 'task_pending',
          assistantId: admin.id,
        },
      });
    }

    return NextResponse.json({ message: 'Değişiklik talebi gönderildi, temsilci onayı bekleniyor', change });
  } catch (error) {
    console.error('Error creating duty change:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT: Approve or reject a pending duty change
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { changeId, action, reviewerId } = body;

    if (!changeId || !action || !reviewerId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const reviewer = await db.researchAssistant.findUnique({ where: { id: reviewerId } });
    if (!reviewer || reviewer.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    const change = await db.pendingDutyChange.findUnique({ where: { id: changeId } });
    if (!change) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    }

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
    }

    return NextResponse.json({ message: action === 'approve' ? 'Onaylandı' : 'Reddedildi' });
  } catch (error) {
    console.error('Error processing duty change:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
