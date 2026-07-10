import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List all announcements with comments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const announcements = await db.announcement.findMany({
      where: department ? { department } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: true },
        },
      },
    });
    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Create new announcement (manager only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, authorId, department } = body;

    if (!title || !content || !authorId) {
      return NextResponse.json({ error: 'Başlık, içerik ve yazar gerekli' }, { status: 400 });
    }

    // Verify author is a manager (admin, dekan, baskan)
    const author = await db.researchAssistant.findUnique({ where: { id: authorId } });
    if (!author || !['admin', 'dekan', 'baskan'].includes(author.role)) {
      return NextResponse.json({ error: 'Duyuru oluşturma yetkiniz yok' }, { status: 403 });
    }

    // Announcement belongs to the department it was posted in.
    // Dekan is faculty-wide, so use the department they posted from; others use their own.
    const annDept = department || author.department;

    const announcement = await db.announcement.create({
      data: { title, content, authorId, department: annDept },
      include: { author: true },
    });

    // Notify active ar.gör and temsilci of that department about the new announcement
    const recipients = await db.researchAssistant.findMany({
      where: { isActive: true, role: { in: ['user', 'admin'] }, department: annDept },
    });
    for (const r of recipients) {
      if (r.id !== authorId) {
        await db.notification.create({
          data: {
            title: 'Yeni Duyuru',
            message: `"${title}" - ${author.name} yeni bir duyuru paylaştı`,
            type: 'info',
            assistantId: r.id,
            relatedId: announcement.id,
          },
        });
      }
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT: Add comment to announcement
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { announcementId, content, authorId } = body;

    if (!announcementId || !content || !authorId) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const comment = await db.announcementComment.create({
      data: { announcementId, content, authorId },
      include: { author: true },
    });

    // Notify announcement author about the comment
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { author: true },
    });
    if (announcement && announcement.authorId !== authorId) {
      const commenter = await db.researchAssistant.findUnique({ where: { id: authorId } });
      await db.notification.create({
        data: {
          title: 'Duyurunuza Yorum Geldi',
          message: `${commenter?.name} "${announcement.title}" duyurusuna yorum yaptı: "${content}"`,
          type: 'info',
          assistantId: announcement.authorId,
          relatedId: announcementId,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE: Delete announcement (manager only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requesterId = searchParams.get('requesterId');

    if (!id || !requesterId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const requester = await db.researchAssistant.findUnique({ where: { id: requesterId } });
    if (!requester || !['admin', 'dekan', 'baskan'].includes(requester.role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 });
    }

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ message: 'Duyuru silindi' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
