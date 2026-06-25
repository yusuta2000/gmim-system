import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 });
    }

    // Get the exam
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { supervisors: true },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const needed = exam.requiredSupervisors - exam.supervisors.length;
    if (needed <= 0) {
      return NextResponse.json({ message: 'Bu sınav için yeterli gözetmen zaten atanmış', exam }, { status: 200 });
    }

    // Get all assistants sorted by totalPoints ascending (lowest points = highest priority)
    const assistants = await db.researchAssistant.findMany({
      where: { isActive: true },
      orderBy: { totalPoints: 'asc' },
    });

    // Get existing supervisor IDs for this exam
    const existingSupervisorIds = exam.supervisors.map(s => s.assistantId);

    // Filter out already assigned assistants
    const availableAssistants = assistants.filter(a => !existingSupervisorIds.includes(a.id));

    // Assign the needed number of supervisors (lowest points first)
    const toAssign = availableAssistants.slice(0, needed);

    const assignments = [];
    for (const assistant of toAssign) {
      const assignment = await db.examSupervisor.create({
        data: {
          examId: exam.id,
          assistantId: assistant.id,
        },
        include: {
          assistant: true,
        },
      });
      assignments.push(assignment);

      // Add supervisor points to assistant
      const supervisorCategory = await db.pointCategory.findFirst({
        where: { name: { contains: 'Gözetmenlik' } },
      });
      const pointsToAdd = supervisorCategory?.points || 4;

      await db.researchAssistant.update({
        where: { id: assistant.id },
        data: { totalPoints: { increment: pointsToAdd } },
      });

      // Create a task for this assignment
      const maxTask = await db.task.findFirst({
        where: { assistantId: assistant.id },
        orderBy: { number: 'desc' },
        select: { number: true },
      });

      await db.task.create({
        data: {
          number: (maxTask?.number || 0) + 1,
          description: `Gözetmenlik: ${exam.courseCode} - ${exam.courseName}`,
          hoursWorked: exam.timeSlot,
          date: exam.date,
          points: pointsToAdd,
          status: 'approved',
          source: 'auto_assigned',
          assistantId: assistant.id,
          categoryId: supervisorCategory?.id || null,
        },
      });
    }

    const updatedExam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        supervisors: {
          include: { assistant: true },
        },
      },
    });

    return NextResponse.json({
      message: `${assignments.length} gözetmen atandı`,
      assignments,
      exam: updatedExam,
    });
  } catch (error) {
    console.error('Error assigning supervisors:', error);
    return NextResponse.json({ error: 'Failed to assign supervisors' }, { status: 500 });
  }
}
