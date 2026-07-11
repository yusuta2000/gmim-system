import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import type { TaskSource, TaskStatus } from '@prisma/client';

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'dekan' || user.role === 'baskan';
}

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);

    const tasks = await db.task.findMany({
      where: isManager(user) ? { assistant: { department } } : { assistantId: user.id },
      orderBy: { date: 'desc' },
      include: {
        assistant: true,
        category: true,
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { description, hoursWorked, date, assistantId, categoryId, points, source, notes } = body;

    if (!description || !date || !assistantId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const assistant = await db.researchAssistant.findUnique({ where: { id: assistantId } });
    if (!assistant) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, assistant.department as SessionUser['department']);
    if (!isManager(user) && assistantId !== user.id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    // Get the max task number for this assistant
    const maxTask = await db.task.findFirst({
      where: { assistantId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNumber = (maxTask?.number || 0) + 1;

    // Determine status based on source:
    // - If submitted by the ar.gör themselves (self-reported): PENDING (needs temsilci approval)
    // - If assigned by temsilci/manager: ASSIGNED (ar.gör must accept or reject)
    // - If auto-assigned (exam supervisor): APPROVED directly
    // - If imported: APPROVED directly
    let status: TaskStatus = 'pending';
    const taskSource = (source || 'external') as TaskSource;
    if (isManager(user) && (source === 'auto_assigned' || source === 'import')) {
      status = 'approved';
    } else if (isManager(user) && source === 'temsilci_assigned') {
      status = 'assigned'; // ar.gör must accept/reject
    } else {
      // Self-reported by ar.gör → needs approval
      status = 'pending';
    }

    const task = await db.task.create({
      data: {
        number: nextNumber,
        description,
        hoursWorked: hoursWorked || null,
        date: new Date(date),
        points: points || 0,
        status,
        source: taskSource,
        notes: notes || null,
        assignedBy: isManager(user) ? user.id : null,
        assistantId,
        categoryId: categoryId || null,
      },
      include: {
        assistant: true,
        category: true,
      },
    });

    // Only add points immediately if approved
    if (status === 'approved' && points > 0) {
      await db.researchAssistant.update({
        where: { id: assistantId },
        data: { totalPoints: { increment: points } },
      });
    }

    // Create notification
    if (status === 'pending') {
      // Notify managers of this task's department (admin/baskan) plus the faculty-wide dekan
      const managers = await db.researchAssistant.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { in: ['admin', 'baskan'] }, department: task.assistant.department },
            { role: 'dekan' },
          ],
        },
      });
      for (const m of managers) {
        await db.notification.create({
          data: {
            title: 'Onay Bekleyen Görev',
            message: `${task.assistant.name} yeni görev gönderdi: "${description}". Puan: ${points || 'Belirsiz'}`,
            type: 'task_pending',
            assistantId: m.id,
            relatedId: task.id,
          },
        });
      }
      // Also notify the ar.gör that their task is submitted
      await db.notification.create({
        data: {
          title: 'Görev Gönderildi',
          message: `"${description}" göreviniz temsilci onayına gönderildi. Onaylandıktan sonra puan eklenecektir.`,
          type: 'info',
          assistantId,
          relatedId: task.id,
        },
      });
    } else if (status === 'assigned') {
      // Notify the ar.gör they need to accept/reject
      await db.notification.create({
        data: {
          title: 'Yeni Görev Atandı - Yanıt Bekleniyor',
          message: `"${description}" görevi size atandı. Puan: ${points}. Görevler sekmesinden kabul edebilir veya reddedebilirsiniz.`,
          type: 'task_assigned',
          assistantId,
          relatedId: task.id,
        },
      });
    } else {
      // Approved directly (auto-assigned or imported) - notify the assistant
      await db.notification.create({
        data: {
          title: 'Yeni Görev',
          message: `"${description}" görevi eklendi. Puan: ${points}`,
          type: 'task_assigned',
          assistantId,
          relatedId: task.id,
        },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
