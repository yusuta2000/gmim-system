import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const exams = await db.exam.findMany({
      where: department ? { department } : {},
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
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseCode, courseName, instructor, date, day, timeSlot, requiredSupervisors, classroom, notes, department } = body;

    const exam = await db.exam.create({
      data: {
        courseCode,
        courseName,
        instructor,
        date: new Date(date),
        day,
        timeSlot,
        department: department || 'GMIM',
        requiredSupervisors: requiredSupervisors || 1,
        classroom: classroom || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
