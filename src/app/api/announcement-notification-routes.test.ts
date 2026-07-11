import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    announcement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    announcementComment: {
      create: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {
    constructor() {
      super('UNAUTHENTICATED')
    }
  }

  return {
    requireSession: vi.fn(),
    UnauthenticatedError,
  }
})

import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { GET as getAnnouncements, POST as createAnnouncement, PUT as commentAnnouncement, DELETE as deleteAnnouncement } from '@/app/api/announcements/route'
import { GET as getNotifications, POST as createNotification, PUT as updateNotification } from '@/app/api/notifications/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const announcement = db.announcement as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const announcementComment = db.announcementComment as unknown as { create: ReturnType<typeof vi.fn> }
const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
}
const notification = db.notification as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const announcementRecord = {
  id: 'announcement-1',
  title: 'Title',
  department: 'GMIM',
  authorId: 'admin-1',
  author: { id: 'admin-1' },
}
const assistant = { id: 'user-1', department: 'GMIM' }

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('announcement and notification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    announcement.findMany.mockResolvedValue([announcementRecord])
    announcement.findUnique.mockResolvedValue(announcementRecord)
    announcement.create.mockResolvedValue(announcementRecord)
    announcement.delete.mockResolvedValue({})
    announcementComment.create.mockResolvedValue({ id: 'comment-1' })
    researchAssistant.findUnique.mockResolvedValue(assistant)
    researchAssistant.findMany.mockResolvedValue([assistant])
    notification.findMany.mockResolvedValue([{ id: 'notification-1' }])
    notification.findUnique.mockResolvedValue({ id: 'notification-1', assistantId: 'user-1' })
    notification.count.mockResolvedValue(1)
    notification.create.mockResolvedValue({ id: 'notification-1' })
    notification.update.mockResolvedValue({})
    notification.updateMany.mockResolvedValue({})
  })

  it('announcement GET requires session and department access', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())
    expect((await getAnnouncements(new Request('http://localhost/api/announcements?department=GMIM'))).status).toBe(401)

    requireSessionMock.mockResolvedValue(adminUser)
    const response = await getAnnouncements(new Request('http://localhost/api/announcements?department=DUIM'))
    expect(response.status).toBe(403)
    expect(announcement.findMany).not.toHaveBeenCalled()
  })

  it('announcement GET projects authors and comments through a safe DTO', async () => {
    const response = await getAnnouncements(new Request('http://localhost/api/announcements?department=GMIM'))

    expect(response.status).toBe(200)
    expect(announcement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { department: 'GMIM' },
      select: expect.objectContaining({
        id: true,
        title: true,
        author: { select: { id: true, name: true, role: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: expect.objectContaining({
            id: true,
            content: true,
            author: { select: { id: true, name: true, role: true } },
          }),
        },
      }),
    }))
    expect(announcement.findMany.mock.calls[0][0]).not.toHaveProperty('include')
  })

  it('announcement DELETE rejects regular users even in their own department', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await deleteAnnouncement(new Request('http://localhost/api/announcements?id=announcement-1'))

    expect(response.status).toBe(403)
    expect(announcement.delete).not.toHaveBeenCalled()
  })

  it('announcement POST ignores forged authorId and requires manager department access', async () => {
    const response = await createAnnouncement(jsonRequest('/api/announcements', {
      title: 'Title',
      content: 'Body',
      authorId: 'forged-admin',
      department: 'GMIM',
    }))

    expect(response.status).toBe(201)
    expect(announcement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { title: 'Title', content: 'Body', authorId: 'admin-1', department: 'GMIM' },
    }))
  })

  it('announcement PUT comments as the session user and rejects cross-department comments', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    announcement.findUnique.mockResolvedValue({ ...announcementRecord, department: 'DUIM' })

    const forbidden = await commentAnnouncement(jsonRequest('/api/announcements', {
      announcementId: 'announcement-1',
      content: 'Comment',
      authorId: 'forged-user',
    }))
    expect(forbidden.status).toBe(403)

    announcement.findUnique.mockResolvedValue(announcementRecord)
    const response = await commentAnnouncement(jsonRequest('/api/announcements', {
      announcementId: 'announcement-1',
      content: 'Comment',
      authorId: 'forged-user',
    }))
    expect(response.status).toBe(201)
    expect(announcementComment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { announcementId: 'announcement-1', content: 'Comment', authorId: 'user-1' },
    }))
  })

  it('announcement DELETE ignores requesterId and checks target department', async () => {
    announcement.findUnique.mockResolvedValue({ ...announcementRecord, department: 'DUIM' })

    const response = await deleteAnnouncement(new Request('http://localhost/api/announcements?id=announcement-1&requesterId=forged-admin'))

    expect(response.status).toBe(403)
    expect(announcement.delete).not.toHaveBeenCalled()
  })

  it('notifications GET ignores assistantId and reads only the session user notifications', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await getNotifications(new Request('http://localhost/api/notifications?assistantId=other-user&unread=true'))

    expect(response.status).toBe(200)
    expect(notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assistantId: 'user-1', isRead: false },
    }))
    expect(notification.count).toHaveBeenCalledWith({
      where: { assistantId: 'user-1', isRead: false },
    })
  })

  it('notifications POST requires manager access to the target assistant department', async () => {
    researchAssistant.findUnique.mockResolvedValue({ ...assistant, department: 'DUIM' })

    const response = await createNotification(jsonRequest('/api/notifications', {
      title: 'Title',
      message: 'Message',
      assistantId: 'user-1',
    }))

    expect(response.status).toBe(403)
    expect(notification.create).not.toHaveBeenCalled()
  })

  it('notifications PUT marks only session-owned notifications', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    notification.findUnique.mockResolvedValue({ id: 'notification-1', assistantId: 'other-user' })

    const forbidden = await updateNotification(jsonRequest('/api/notifications', {
      notificationId: 'notification-1',
    }))
    expect(forbidden.status).toBe(403)

    const markAll = await updateNotification(jsonRequest('/api/notifications', {
      markAllRead: true,
      assistantId: 'other-user',
    }))
    expect(markAll.status).toBe(200)
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { assistantId: 'user-1', isRead: false },
      data: { isRead: true },
    })
  })
})
