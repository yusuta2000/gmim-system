import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: { findMany: vi.fn(), findUnique: vi.fn() },
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
const people = db.researchAssistant as unknown as { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> }
const mocks = [people, db.exam, db.pointCategory, db.task] as unknown as { findMany: ReturnType<typeof vi.fn> }[]

describe('GET /api/reports/fix-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const model of mocks) model.findMany.mockResolvedValue([])
    requireSessionMock.mockResolvedValue({ id: 'admin-1', role: 'admin', department: 'GMIM' })
  })

  it('looks like a missing page to every other account', async () => {
    people.findUnique.mockResolvedValue({ email: 'someone@itu.edu.tr' })
    expect((await GET()).status).toBe(404)

    requireSessionMock.mockResolvedValue({ id: 'u', role: 'user', department: 'GMIM' })
    expect((await GET()).status).toBe(404)
  })

  it('returns the plan since September 2026 to the owner account', async () => {
    people.findUnique.mockResolvedValue({ email: 'YMutlu@itu.edu.tr ' })

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ since: '2026-09-01', actions: [], people: [] })
  })
})
