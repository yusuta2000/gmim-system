import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (callback) => callback(db)),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    pointCategory: {
      findUnique: vi.fn(),
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
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'
import { GET as getPendingTasks, PUT as approveTask } from '@/app/api/approve-task/route'
import { PUT as respondTask } from '@/app/api/respond-task/route'
import { DELETE as deleteTask } from '@/app/api/delete-task/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const task = db.task as unknown as {
  count: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  findUniqueOrThrow: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  deleteMany: ReturnType<typeof vi.fn>
}
const queryRaw = db.$queryRaw as unknown as ReturnType<typeof vi.fn>
const executeRaw = db.$executeRaw as unknown as ReturnType<typeof vi.fn>
const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const notification = db.notification as unknown as {
  create: ReturnType<typeof vi.fn>
}
const pointCategory = db.pointCategory as unknown as {
  findUnique: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const targetAssistant = { id: 'target-1', name: 'Target User', department: 'GMIM' }
const baseTask = {
  id: 'task-1',
  assistantId: 'target-1',
  description: 'Task',
  points: 5,
  status: 'pending',
  assistant: targetAssistant,
  category: null,
}
const createBody = {
  description: 'Task',
  date: '2026-01-01',
  assistantId: 'target-1',
  points: 5,
  source: 'temsilci_assigned',
  assignedBy: 'forged-admin',
}

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('task routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    task.findMany.mockResolvedValue([baseTask])
    task.count.mockResolvedValue(1)
    task.findFirst.mockResolvedValue({ number: 3 })
    task.findUnique.mockResolvedValue(baseTask)
    task.findUniqueOrThrow.mockResolvedValue(baseTask)
    task.create.mockResolvedValue({ ...baseTask, status: 'assigned' })
    task.update.mockResolvedValue(baseTask)
    task.updateMany.mockResolvedValue({ count: 1 })
    task.delete.mockResolvedValue({})
    task.deleteMany.mockResolvedValue({ count: 1 })
    queryRaw.mockResolvedValue([{ exists: false }])
    executeRaw.mockResolvedValue(1)
    researchAssistant.findUnique.mockResolvedValue(targetAssistant)
    researchAssistant.findMany.mockResolvedValue([{ id: 'manager-1' }])
    researchAssistant.update.mockResolvedValue({})
    notification.create.mockResolvedValue({})
    pointCategory.findUnique.mockResolvedValue({ id: 'category-1', name: 'Category', points: 5, isActive: true })
  })

  it('tasks GET rejects unauthenticated requests', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await getTasks(new Request('http://localhost/api/tasks?department=GMIM'))

    expect(response.status).toBe(401)
    expect(task.findMany).not.toHaveBeenCalled()
  })

  it('tasks GET limits regular users to their own tasks', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await getTasks(new Request('http://localhost/api/tasks?department=GMIM'))

    expect(response.status).toBe(200)
    expect(task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assistantId: 'user-1' },
      skip: 0,
      take: 20,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    }))
    await expect(response.json()).resolves.toEqual({
      items: [{ ...baseTask, notes: null, rejectionReason: null }],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
  })

  it('tasks GET applies manager filters and bounded pagination', async () => {
    const response = await getTasks(new Request(
      'http://localhost/api/tasks?department=GMIM&page=2&pageSize=10&search=rapor&status=approved&assistantId=target-1&categoryId=category-1&dateFrom=2026-01-01&dateTo=2026-01-31',
    ))

    expect(response.status).toBe(200)
    expect(task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        assistant: { department: 'GMIM' },
        assistantId: 'target-1',
        categoryId: 'category-1',
        status: 'approved',
        description: { contains: 'rapor', mode: 'insensitive' },
        date: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T23:59:59.999Z'),
        },
      },
      skip: 10,
      take: 10,
    }))
  })

  it('tasks GET rejects invalid filter values without querying the database', async () => {
    const response = await getTasks(new Request('http://localhost/api/tasks?page=0&pageSize=500&status=unknown'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ error: 'VALIDATION_ERROR' }))
    expect(task.findMany).not.toHaveBeenCalled()
  })

  it('tasks GET rejects cross-department access for department managers', async () => {
    const response = await getTasks(new Request('http://localhost/api/tasks?department=DUIM'))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(task.findMany).not.toHaveBeenCalled()
  })

  it('tasks POST rejects creating tasks for another assistant by a regular user', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await createTask(jsonRequest('/api/tasks', createBody))

    expect(response.status).toBe(403)
    expect(task.create).not.toHaveBeenCalled()
  })

  it('tasks POST ignores forged assignedBy and uses the session manager', async () => {
    const response = await createTask(jsonRequest('/api/tasks', createBody))

    expect(response.status).toBe(201)
    expect(task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        assignedBy: 'admin-1',
        assistantId: 'target-1',
        status: 'assigned',
      }),
    }))
    expect(executeRaw).toHaveBeenCalled()
    expect(db.$transaction).toHaveBeenCalled()
  })

  it('tasks POST derives category points on the server', async () => {
    const response = await createTask(jsonRequest('/api/tasks', {
      ...createBody,
      categoryId: 'category-1',
      points: 999,
    }))

    expect(response.status).toBe(201)
    expect(task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: 'category-1', points: 5 }),
    }))
  })

  it('tasks POST rejects cross-department target assignment', async () => {
    researchAssistant.findUnique.mockResolvedValue({ ...targetAssistant, department: 'DUIM' })

    const response = await createTask(jsonRequest('/api/tasks', createBody))

    expect(response.status).toBe(403)
    expect(task.create).not.toHaveBeenCalled()
  })

  it('approve-task GET requires a manager session and department access', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const forbidden = await getPendingTasks(new Request('http://localhost/api/approve-task?department=GMIM'))
    expect(forbidden.status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    const crossDepartment = await getPendingTasks(new Request('http://localhost/api/approve-task?department=DUIM'))
    expect(crossDepartment.status).toBe(403)

    const allowed = await getPendingTasks(new Request('http://localhost/api/approve-task?department=GMIM'))
    expect(allowed.status).toBe(200)
    expect(task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pending', assistant: { department: 'GMIM' } },
    }))
  })

  it('approve-task PUT ignores reviewerId and records the session reviewer', async () => {
    const response = await approveTask(jsonRequest('/api/approve-task', {
      taskId: 'task-1',
      action: 'approve',
      reviewerId: 'forged-admin',
    }))

    expect(response.status).toBe(200)
    expect(task.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-1', status: 'pending' },
      data: { status: 'approved', assignedBy: 'admin-1' },
    }))
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { totalPoints: { increment: 5 } },
    })
  })

  it('approve-task PUT rejects cross-department task review', async () => {
    task.findUnique.mockResolvedValue({ ...baseTask, assistant: { ...targetAssistant, department: 'DUIM' } })

    const response = await approveTask(jsonRequest('/api/approve-task', {
      taskId: 'task-1',
      action: 'approve',
      reviewerId: 'forged-admin',
    }))

    expect(response.status).toBe(403)
    expect(task.updateMany).not.toHaveBeenCalled()
  })

  it('approve-task PUT returns conflict and does not increment points after a previous review', async () => {
    task.updateMany.mockResolvedValue({ count: 0 })

    const response = await approveTask(jsonRequest('/api/approve-task', {
      taskId: 'task-1',
      action: 'approve',
    }))

    expect(response.status).toBe(409)
    expect(researchAssistant.update).not.toHaveBeenCalled()
    expect(notification.create).not.toHaveBeenCalled()
  })

  it('approve-task PUT rejects closed-period tasks before changing points', async () => {
    queryRaw
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ status: 'closed' }])

    const response = await approveTask(jsonRequest('/api/approve-task', {
      taskId: 'task-1',
      action: 'approve',
    }))

    expect(response.status).toBe(409)
    expect(task.updateMany).not.toHaveBeenCalled()
    expect(researchAssistant.update).not.toHaveBeenCalled()
    expect(notification.create).not.toHaveBeenCalled()
  })

  it('respond-task PUT rejects forged responderId when session user is not assigned', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    task.findUnique.mockResolvedValue({ ...baseTask, status: 'assigned', assistantId: 'other-user' })

    const response = await respondTask(jsonRequest('/api/respond-task', {
      taskId: 'task-1',
      action: 'accept',
      responderId: 'other-user',
    }))

    expect(response.status).toBe(403)
    expect(task.update).not.toHaveBeenCalled()
  })

  it('respond-task PUT allows the assigned session user to accept', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    task.findUnique.mockResolvedValue({
      ...baseTask,
      status: 'assigned',
      assistantId: 'user-1',
      assistant: { id: 'user-1', name: 'User One', department: 'GMIM' },
    })

    const response = await respondTask(jsonRequest('/api/respond-task', {
      taskId: 'task-1',
      action: 'accept',
      responderId: 'forged-user',
    }))

    expect(response.status).toBe(200)
    expect(task.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', assistantId: 'user-1', status: 'assigned' },
      data: { status: 'approved' },
    })
  })

  it('respond-task PUT requires a rejection reason before changing the task', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await respondTask(jsonRequest('/api/respond-task', {
      taskId: 'task-1',
      action: 'reject',
      rejectionReason: '   ',
    }))

    expect(response.status).toBe(400)
    expect(task.updateMany).not.toHaveBeenCalled()
  })

  it('respond-task PUT stores and notifies managers about the rejection reason', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    task.findUnique.mockResolvedValue({
      ...baseTask,
      notes: 'Planlama notu',
      status: 'assigned',
      assistantId: 'user-1',
      assistant: { id: 'user-1', name: 'User One', department: 'GMIM' },
    })

    const response = await respondTask(jsonRequest('/api/respond-task', {
      taskId: 'task-1',
      action: 'reject',
      rejectionReason: 'Ders programımla çakışıyor',
    }))

    expect(response.status).toBe(200)
    expect(task.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', assistantId: 'user-1', status: 'assigned' },
      data: {
        status: 'rejected',
        notes: 'Planlama notu\n\n[RET_SEBEBI]\nDers programımla çakışıyor',
      },
    })
    expect(notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'task_rejected',
        message: expect.stringContaining('Ders programımla çakışıyor'),
      }),
    }))
  })

  it('respond-task PUT rejects already processed assigned tasks without points', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    task.findUnique.mockResolvedValue({
      ...baseTask,
      status: 'approved',
      assistantId: 'user-1',
      assistant: { id: 'user-1', name: 'User One', department: 'GMIM' },
    })
    task.updateMany.mockResolvedValue({ count: 0 })

    const response = await respondTask(jsonRequest('/api/respond-task', {
      taskId: 'task-1',
      action: 'accept',
    }))

    expect(response.status).toBe(409)
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it('delete-task rejects non-manager sessions', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await deleteTask(new Request('http://localhost/api/delete-task?id=task-1&requesterId=forged-admin'))

    expect(response.status).toBe(403)
    expect(task.deleteMany).not.toHaveBeenCalled()
  })

  it('delete-task rejects cross-department deletion and ignores requesterId', async () => {
    task.findUnique.mockResolvedValue({ ...baseTask, assistant: { ...targetAssistant, department: 'DUIM' } })

    const response = await deleteTask(new Request('http://localhost/api/delete-task?id=task-1&requesterId=forged-admin'))

    expect(response.status).toBe(403)
    expect(task.deleteMany).not.toHaveBeenCalled()
  })

  it('delete-task deletes a session-authorized task and adjusts approved points', async () => {
    task.findUnique.mockResolvedValue({ ...baseTask, status: 'approved' })

    const response = await deleteTask(new Request('http://localhost/api/delete-task?id=task-1&requesterId=forged-admin'))

    expect(response.status).toBe(200)
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { totalPoints: { decrement: 5 } },
    })
    expect(task.deleteMany).toHaveBeenCalledWith({ where: { id: 'task-1' } })
  })
})
