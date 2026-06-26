import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = {};
    if (assistantId) where.assistantId = assistantId;
    if (unreadOnly) where.isRead = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { assistant: true },
      take: 50,
    });

    const unreadCount = await db.notification.count({
      where: { ...(assistantId ? { assistantId } : {}), isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message, type, assistantId, relatedId } = body;

    if (!title || !message || !assistantId) {
      return NextResponse.json({ error: 'title, message, and assistantId are required' }, { status: 400 });
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: type || 'info',
        assistantId,
        relatedId: relatedId || null,
      },
      include: { assistant: true },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, markAllRead, assistantId } = body;

    if (markAllRead && assistantId) {
      await db.notification.updateMany({
        where: { assistantId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'notificationId or markAllRead+assistantId required' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
