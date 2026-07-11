import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { researchAssistant: { findMany: vi.fn() } } }))
vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {}
  return { requireSession: vi.fn(), UnauthenticatedError }
})

import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { GET } from './route'
import type { SessionUser } from '@/lib/auth/session-repository'

const findMany = db.researchAssistant.findMany as unknown as ReturnType<typeof vi.fn>
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const admin: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }

describe('people route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(admin)
    findMany.mockResolvedValue([{ id: 'user-1', name: 'Ada', email: 'ada@example.com', role: 'user', isActive: true }])
  })

  it('rejects regular users and cross-department managers', async () => {
    requireSessionMock.mockResolvedValue({ ...admin, role: 'user' })
    expect((await GET(new Request('http://localhost/api/people?department=GMIM'))).status).toBe(403)
    requireSessionMock.mockResolvedValue(admin)
    expect((await GET(new Request('http://localhost/api/people?department=DUIM'))).status).toBe(403)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('uses an explicit management DTO without password, phone, points or timestamps', async () => {
    const response = await GET(new Request('http://localhost/api/people?department=GMIM'))

    expect(response.status).toBe(200)
    expect(findMany).toHaveBeenCalledWith({
      where: { OR: [{ department: 'GMIM' }, { role: 'dekan' }] },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        faculty: true,
        department: true,
        role: true,
        isActive: true,
        permanentDuties: { orderBy: { order: 'asc' }, select: { id: true, name: true, description: true } },
      },
    })
  })

  it('returns a minimal options DTO for calendar forms', async () => {
    await GET(new Request('http://localhost/api/people?department=GMIM&mode=options'))
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: { id: true, name: true, role: true, isActive: true },
    }))
  })
})
