import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';

// GET: List all announcements with comments
export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const department = (searchParams.get('department') || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);
    const announcements = await db.announcement.findMany({
      where: { department },
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
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Create new announcement (manager only)
export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const body = await request.json();
    const { title, content, department } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve içerik gerekli' }, { status: 400 });
    }

    // Announcement belongs to the department it was posted in.
    // Dekan is faculty-wide, so use the department they posted from; others use their own.
    const annDept = (department || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, annDept);

    const announcement = await db.announcement.create({
      data: { title, content, authorId: user.id, department: annDept },
      include: { author: true },
    });

    // Notify active ar.gör and temsilci of that department about the new announcement
    const recipients = await db.researchAssistant.findMany({
      where: { isActive: true, role: { in: ['user', 'admin'] }, department: annDept },
    });
    for (const r of recipients) {
      if (r.id !== user.id) {
        await db.notification.create({
          data: {
            title: 'Yeni Duyuru',
            message: `"${title}" - yeni bir duyuru paylaşıldı`,
            type: 'info',
            assistantId: r.id,
            relatedId: announcement.id,
          },
        });
      }
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PUT: Add comment to announcement
export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const { announcementId, content } = body;

    if (!announcementId || !content) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { author: true },
    });
    if (!announcement) {
      return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, announcement.department as SessionUser['department']);

    const comment = await db.announcementComment.create({
      data: { announcementId, content, authorId: user.id },
      include: { author: true },
    });

    // Notify announcement author about the comment
    if (announcement.authorId !== user.id) {
      await db.notification.create({
        data: {
          title: 'Duyurunuza Yorum Geldi',
          message: `"${announcement.title}" duyurusuna yorum yapıldı: "${content}"`,
          type: 'info',
          assistantId: announcement.authorId,
          relatedId: announcementId,
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE: Delete announcement (manager only)
export async function DELETE(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({ where: { id } });
    if (!announcement) {
      return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 });
    }
    assertDepartmentAccess(user, announcement.department as SessionUser['department']);

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ message: 'Duyuru silindi' });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }

    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
