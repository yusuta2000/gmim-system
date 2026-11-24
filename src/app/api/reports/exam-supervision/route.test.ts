import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: { findMany: vi.fn() },
    exam: { findMany: vi.fn() },
    pointCategory: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {}
  return { requireSession: vi.fn(), UnauthenticatedError }
})

import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { GET } from './route'

const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const mocks = db as unknown as Record<'researchAssistant' | 'exam' | 'pointCategory' | 'task', { findMany: ReturnType<typeof vi.fn> }>

describe('GET /api/reports/exam-supervision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const model of Object.values(mocks)) model.findMany.mockResolvedValue([])
  })

  it('is only for managers of the requested department', async () => {
    requireSessionMock.mockResolvedValue({ id: 'u', role: 'user', department: 'GMIM' })
    expect((await GET(new Request('http://localhost/api/reports/exam-supervision?department=GMIM'))).status).toBe(403)

    requireSessionMock.mockResolvedValue({ id: 'a', role: 'admin', department: 'GMIM' })
    expect((await GET(new Request('http://localhost/api/reports/exam-supervision?department=DUIM'))).status).toBe(403)
  })

  it('reads only the department data and returns the report', async () => {
    requireSessionMock.mockResolvedValue({ id: 'a', role: 'admin', department: 'GMIM' })

    const response = await GET(new Request('http://localhost/api/reports/exam-supervision?department=GMIM'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ checkedTasks: 0, duplicates: [], sameDay: [], mismatches: [] })
    expect(mocks.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assistant: { department: 'GMIM' } }) }))
  })
})
