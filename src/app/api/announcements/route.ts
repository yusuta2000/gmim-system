import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { commentAnnouncementSchema, createAnnouncementSchema } from '@/features/announcements/schemas'
import { departmentSchema } from '@/features/calendar/schemas'

const authorSelect = { id: true, name: true, role: true } as const
const announcementSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: authorSelect },
    },
  },
} as const

function routeError(error: unknown, fallback: string) {
  if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.code }, { status: 403 })
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'BAD_REQUEST', issues: error.issues }, { status: 400 })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    const department = departmentSchema.parse(new URL(request.url).searchParams.get('department') || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)
    const announcements = await db.announcement.findMany({
      where: { department },
      orderBy: { createdAt: 'desc' },
      select: announcementSelect,
    })
    return NextResponse.json(announcements)
  } catch (error) {
    return routeError(error, 'Duyurular alınamadı')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const body = await request.json()
    const requestedDepartment = departmentSchema.parse(body.department || user.department) as SessionUser['department']
    assertDepartmentAccess(user, requestedDepartment)
    const { title, content, department } = createAnnouncementSchema.parse(body)
    const announcementDepartment = (department || user.department) as SessionUser['department']
    const announcement = await db.announcement.create({
      data: { title, content, authorId: user.id, department: announcementDepartment },
      select: announcementSelect,
    })
    const recipients = await db.researchAssistant.findMany({
      where: { isActive: true, role: { in: ['user', 'admin'] }, department: announcementDepartment },
      select: { id: true },
    })
    await Promise.all(recipients.filter((recipient) => recipient.id !== user.id).map((recipient) => db.notification.create({
      data: {
        title: 'Yeni Duyuru',
        message: `"${title}" başlıklı yeni bir duyuru paylaşıldı`,
        type: 'info',
        assistantId: recipient.id,
        relatedId: announcement.id,
      },
    })))
    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    return routeError(error, 'Duyuru oluşturulamadı')
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireSession()
    const { announcementId, content } = commentAnnouncementSchema.parse(await request.json())
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, title: true, authorId: true, department: true },
    })
    if (!announcement) return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 })
    assertDepartmentAccess(user, announcement.department as SessionUser['department'])
    const comment = await db.announcementComment.create({
      data: { announcementId, content, authorId: user.id },
      select: { id: true, content: true, createdAt: true, author: { select: authorSelect } },
    })
    if (announcement.authorId !== user.id) {
      await db.notification.create({
        data: {
          title: 'Duyurunuza Yorum Geldi',
          message: `"${announcement.title}" duyurusuna yeni bir yorum yapıldı`,
          type: 'info',
          assistantId: announcement.authorId,
          relatedId: announcementId,
        },
      })
    }
    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    return routeError(error, 'Yorum eklenemedi')
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const announcement = await db.announcement.findUnique({ where: { id }, select: { id: true, department: true } })
    if (!announcement) return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 })
    assertDepartmentAccess(user, announcement.department as SessionUser['department'])
    await db.announcement.delete({ where: { id } })
    return NextResponse.json({ message: 'Duyuru silindi' })
  } catch (error) {
    return routeError(error, 'Duyuru silinemedi')
  }
}
