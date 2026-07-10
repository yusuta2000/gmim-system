import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    // Department-scoped: return the department's members. Dekan is faculty-wide,
    // so it appears in every department's management view.
    const where = department
      ? { OR: [{ department }, { role: 'dekan' }] }
      : {};
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
    // Strip passwords from response for security
    const sanitized = assistants.map(({ password: _, ...rest }) => rest);
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Error fetching assistants:', error);
    return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 });
  }
}
