import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => Buffer.from('xlsx')),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (callback) => callback(db)),
    pointCategory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    academicPeriod: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    importBatch: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    importBatchRow: {
      create: vi.fn(),
    },
    importLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    exam: {
      findMany: vi.fn(),
      create: vi.fn(),
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

vi.mock('@/lib/auth/password', () => ({ verifyPassword: vi.fn() }))

import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { GET as getCategories, POST as createCategory } from '@/app/api/categories/route'
import { GET as exportExcel } from '@/app/api/export-excel/route'
import { POST as resetPeriod } from '@/app/api/reset-period/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const pointCategory = db.pointCategory as unknown as {
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}
const importLog = db.importLog as unknown as {
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const academicPeriod = db.academicPeriod as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  updateMany: ReturnType<typeof vi.fn>
}
const task = db.task as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const exam = db.exam as unknown as {
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const verifyPasswordMock = verifyPassword as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin data routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    verifyPasswordMock.mockResolvedValue(true)
    researchAssistant.findUnique.mockResolvedValue({ passwordHash: 'stored-hash' })
    pointCategory.findMany.mockResolvedValue([])
    pointCategory.create.mockResolvedValue({ id: 'cat-1' })
    importLog.create.mockResolvedValue({ id: 'import-1' })
    importLog.update.mockResolvedValue({})
    academicPeriod.findFirst.mockResolvedValue(null)
    academicPeriod.create.mockResolvedValue({ id: 'period-1' })
    academicPeriod.update.mockResolvedValue({})
    researchAssistant.findMany.mockResolvedValue([])
    researchAssistant.update.mockResolvedValue({})
    researchAssistant.updateMany.mockResolvedValue({})
    task.findMany.mockResolvedValue([])
    task.findFirst.mockResolvedValue(null)
    task.create.mockResolvedValue({})
    exam.findMany.mockResolvedValue([])
    exam.create.mockResolvedValue({})
  })

  it('categories GET requires a session and POST requires a manager', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())
    expect((await getCategories()).status).toBe(401)

    requireSessionMock.mockResolvedValue(regularUser)
    const forbidden = await createCategory(jsonRequest('/api/categories', { name: 'Cat', points: 1 }))
    expect(forbidden.status).toBe(403)
  })

  it('categories POST creates a category for manager sessions', async () => {
    const response = await createCategory(jsonRequest('/api/categories', { name: 'Cat', points: 1 }))

    expect(response.status).toBe(201)
    expect(pointCategory.create).toHaveBeenCalledWith({
      data: { name: 'Cat', points: 1, description: null },
    })
  })

  it('export-excel requires manager department access and filters by department', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    expect((await exportExcel(new Request('http://localhost/api/export-excel?type=tasks&department=GMIM'))).status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    expect((await exportExcel(new Request('http://localhost/api/export-excel?type=tasks&department=DUIM'))).status).toBe(403)

    const response = await exportExcel(new Request('http://localhost/api/export-excel?type=tasks&department=GMIM'))
    expect(response.status).toBe(200)
    expect(task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assistant: { department: 'GMIM' } },
    }))
  })

  it('reset-period requires manager department access and scopes updates to that department', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    expect((await resetPeriod(jsonRequest('/api/reset-period', { action: 'reset', department: 'GMIM' }))).status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    expect((await resetPeriod(jsonRequest('/api/reset-period', { action: 'reset', department: 'DUIM' }))).status).toBe(403)

    const response = await resetPeriod(jsonRequest('/api/reset-period', {
      action: 'reset', department: 'GMIM', confirmation: 'GMIM SIFIRLA', currentPassword: 'correct-password',
    }))
    expect(response.status).toBe(200)
    expect(verifyPasswordMock).toHaveBeenCalledWith('stored-hash', 'correct-password')
    expect(researchAssistant.updateMany).toHaveBeenCalledWith({
      where: { department: 'GMIM' },
      data: { totalPoints: 0 },
    })
    expect(importLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fileType: 'audit', status: 'completed' }),
    })
  })

  it('reset-period rejects missing confirmation and failed re-auth before writes', async () => {
    const missingConfirmation = await resetPeriod(jsonRequest('/api/reset-period', {
      action: 'reset', department: 'GMIM', currentPassword: 'correct-password',
    }))
    expect(missingConfirmation.status).toBe(400)

    verifyPasswordMock.mockResolvedValue(false)
    const failedReauth = await resetPeriod(jsonRequest('/api/reset-period', {
      action: 'reset', department: 'GMIM', confirmation: 'GMIM SIFIRLA', currentPassword: 'wrong-password',
    }))
    expect(failedReauth.status).toBe(401)
    expect(researchAssistant.updateMany).not.toHaveBeenCalled()
    expect(importLog.create).not.toHaveBeenCalled()
  })
})
