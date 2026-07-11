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

import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { GET as getCategories, POST as createCategory } from '@/app/api/categories/route'
import { POST as importExcel } from '@/app/api/import-excel/route'
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

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function importRequest(department: string) {
  const file = { name: 'tasks.csv', arrayBuffer: vi.fn() }
  return {
    formData: async () => ({
      get: (key: string) => {
        if (key === 'department') return department
        if (key === 'type') return 'tasks'
        if (key === 'file') return file
        return null
      },
    }),
  } as unknown as Request
}

describe('admin data routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
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

  it('import-excel requires manager department access before parsing files', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    expect((await importExcel(importRequest('GMIM'))).status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    const crossDepartment = await importExcel(importRequest('DUIM'))
    expect(crossDepartment.status).toBe(403)
    expect(importLog.create).not.toHaveBeenCalled()
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

    const response = await resetPeriod(jsonRequest('/api/reset-period', { action: 'reset', department: 'GMIM' }))
    expect(response.status).toBe(200)
    expect(researchAssistant.updateMany).toHaveBeenCalledWith({
      where: { department: 'GMIM' },
      data: { totalPoints: 0 },
    })
  })
})
