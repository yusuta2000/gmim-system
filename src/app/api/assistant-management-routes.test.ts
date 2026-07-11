import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    pendingDutyChange: {
      deleteMany: vi.fn(),
    },
    permanentDuty: {
      deleteMany: vi.fn(),
    },
    weeklySchedule: {
      deleteMany: vi.fn(),
    },
    examSupervisor: {
      deleteMany: vi.fn(),
    },
    task: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(),
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
import { hashPassword } from '@/lib/auth/password'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { POST as addAssistant } from '@/app/api/add-assistant/route'
import { DELETE as removeAssistant } from '@/app/api/remove-assistant/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const notification = db.notification as unknown as {
  create: ReturnType<typeof vi.fn>
  deleteMany: ReturnType<typeof vi.fn>
}
const pendingDutyChange = db.pendingDutyChange as unknown as { deleteMany: ReturnType<typeof vi.fn> }
const permanentDuty = db.permanentDuty as unknown as { deleteMany: ReturnType<typeof vi.fn> }
const weeklySchedule = db.weeklySchedule as unknown as { deleteMany: ReturnType<typeof vi.fn> }
const examSupervisor = db.examSupervisor as unknown as { deleteMany: ReturnType<typeof vi.fn> }
const task = db.task as unknown as { deleteMany: ReturnType<typeof vi.fn> }
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const hashPasswordMock = hashPassword as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const addBody = {
  name: 'New User',
  email: 'new@example.com',
  department: 'GMIM',
  password: 'new-pass',
  requesterId: 'forged-admin',
}
const targetAssistant = {
  id: 'target-1',
  name: 'Target User',
  role: 'user',
  department: 'GMIM',
  tasks: [{ id: 'task-1' }],
  permanentDuties: [{ id: 'duty-1' }],
}

function addRequest(body: unknown) {
  return new Request('http://localhost/api/add-assistant', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function removeRequest(id = 'target-1') {
  return new Request(`http://localhost/api/remove-assistant?id=${id}&requesterId=forged-admin`, {
    method: 'DELETE',
  })
}

describe('assistant management routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    hashPasswordMock.mockResolvedValue('new-hash')
    researchAssistant.findUnique.mockResolvedValue(null)
    researchAssistant.findFirst.mockResolvedValue({ order: 7 })
    researchAssistant.findMany.mockResolvedValue([{ totalPoints: 10 }, { totalPoints: 14 }])
    researchAssistant.create.mockResolvedValue({
      id: 'new-1',
      name: 'New User',
      email: 'new@example.com',
      password: null,
      passwordHash: 'new-hash',
      department: 'GMIM',
      role: 'user',
    })
    researchAssistant.delete.mockResolvedValue({})
    notification.create.mockResolvedValue({})
    notification.deleteMany.mockResolvedValue({})
    pendingDutyChange.deleteMany.mockResolvedValue({})
    permanentDuty.deleteMany.mockResolvedValue({})
    weeklySchedule.deleteMany.mockResolvedValue({})
    examSupervisor.deleteMany.mockResolvedValue({})
    task.deleteMany.mockResolvedValue({})
  })

  it.each([
    ['add-assistant', () => addAssistant(addRequest(addBody))],
    ['remove-assistant', () => removeAssistant(removeRequest())],
  ])('%s rejects unauthenticated requests before trusting requester ids', async (_name, callRoute) => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await callRoute()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' })
    expect(researchAssistant.create).not.toHaveBeenCalled()
    expect(researchAssistant.delete).not.toHaveBeenCalled()
  })

  it.each([
    ['add-assistant', () => addAssistant(addRequest(addBody))],
    ['remove-assistant', () => removeAssistant(removeRequest())],
  ])('%s rejects non-manager sessions', async (_name, callRoute) => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await callRoute()

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(researchAssistant.create).not.toHaveBeenCalled()
    expect(researchAssistant.delete).not.toHaveBeenCalled()
  })

  it('add-assistant rejects cross-department creation for department managers', async () => {
    const response = await addAssistant(addRequest({ ...addBody, department: 'DUIM' }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(researchAssistant.findUnique).not.toHaveBeenCalled()
    expect(researchAssistant.create).not.toHaveBeenCalled()
  })

  it('remove-assistant rejects cross-department deletion for department managers', async () => {
    researchAssistant.findUnique.mockResolvedValue({ ...targetAssistant, department: 'DUIM' })

    const response = await removeAssistant(removeRequest())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(researchAssistant.delete).not.toHaveBeenCalled()
  })

  it('add-assistant writes a password hash and never writes plaintext password', async () => {
    const response = await addAssistant(addRequest(addBody))

    expect(response.status).toBe(201)
    expect(hashPasswordMock).toHaveBeenCalledWith('new-pass')
    expect(researchAssistant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        department: 'GMIM',
        passwordHash: 'new-hash',
        role: 'user',
        totalPoints: 12,
      }),
    })
    expect(researchAssistant.create.mock.calls[0][0].data).not.toHaveProperty('password')
  })

  it('remove-assistant ignores requesterId and deletes only a session-authorized target', async () => {
    researchAssistant.findUnique.mockResolvedValue(targetAssistant)

    const response = await removeAssistant(removeRequest())

    expect(response.status).toBe(200)
    expect(notification.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(pendingDutyChange.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(permanentDuty.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(weeklySchedule.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(examSupervisor.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(task.deleteMany).toHaveBeenCalledWith({ where: { assistantId: 'target-1' } })
    expect(researchAssistant.delete).toHaveBeenCalledWith({ where: { id: 'target-1' } })
  })
})
