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
    const { description, hoursWorked, date, assistantId, categoryId, points, source, notes } = body;

    // Get the max task number for this assistant
    const maxTask = await db.task.findFirst({
      where: { assistantId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNumber = (maxTask?.number || 0) + 1;

    const task = await db.task.create({
      data: {
        number: nextNumber,
        description,
        hoursWorked: hoursWorked || null,
        date: new Date(date),
        points: points || 0,
        status: 'pending',
        source: source || 'external',
        notes: notes || null,
        assistantId,
        categoryId: categoryId || null,
      },
      include: {
        assistant: true,
        category: true,
      },
    });

    // Update assistant total points
    if (points > 0) {
      await db.researchAssistant.update({
        where: { id: assistantId },
        data: { totalPoints: { increment: points } },
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
