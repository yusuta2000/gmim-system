import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Reset points for a new period - carries over history but resets point totals
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, carryOverPoints, department } = body;

    // action: 'reset' = zero all points, 'archive' = save current as archive and reset
    if (action === 'reset') {
      // Zero out points for this department only
      await db.researchAssistant.updateMany({
        where: department ? { department } : {},
        data: { totalPoints: 0 },
      });

      // Mark all existing tasks as archived (status = approved stays, but we note the period)
      return NextResponse.json({
        message: 'Tüm puanlar sıfırlandı. Yeni dönem başladı!',
        action: 'reset',
      });
    }

    if (action === 'archive') {
      // Carry over points as starting balance
      if (carryOverPoints && typeof carryOverPoints === 'object') {
        for (const [assistantId, points] of Object.entries(carryOverPoints)) {
          await db.researchAssistant.update({
            where: { id: assistantId },
            data: { totalPoints: points as number },
          });
        }
      }
      return NextResponse.json({
        message: 'Puanlar taşındı. Yeni dönem başladı!',
        action: 'archive',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "reset" or "archive"' }, { status: 400 });
  } catch (error) {
    console.error('Error resetting period:', error);
    return NextResponse.json({ error: 'Failed to reset period' }, { status: 500 });
  }
}
