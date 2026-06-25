import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const assistants = await db.researchAssistant.findMany({
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        permanentDuties: {
          orderBy: { order: 'asc' },
        },
      },
    });
    return NextResponse.json(assistants);
  } catch (error) {
    console.error('Error fetching assistants:', error);
    return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 });
  }
}
