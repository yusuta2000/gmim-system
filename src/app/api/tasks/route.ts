import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: { date: 'desc' },
      include: {
        assistant: true,
        category: true,
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, hoursWorked, date, assistantId, categoryId, points, source, notes, assignedBy, submittedBy } = body;

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
    let status = 'pending';
    if (source === 'auto_assigned' || source === 'import') {
      status = 'approved';
    } else if (source === 'temsilci_assigned') {
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
        source: source || 'external',
        notes: notes || null,
        assignedBy: assignedBy || null,
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
      // Notify ALL managers about the pending task
      const managers = await db.researchAssistant.findMany({
        where: { role: { in: ['admin', 'dekan', 'baskan'] }, isActive: true },
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
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
