import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
  UnauthenticatedError: class UnauthenticatedError extends Error {},
}))

import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { GET } from '@/app/api/points/route'

const session = requireSession as unknown as ReturnType<typeof vi.fn>
const assistants = db.researchAssistant as unknown as { findMany: ReturnType<typeof vi.fn> }
const tasks = db.task as unknown as { findMany: ReturnType<typeof vi.fn> }

describe('points route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assistants.findMany.mockResolvedValue([
      { id: 'user-1', name: 'Ada', totalPoints: 12, order: 1, isActive: true, role: 'user' },
      { id: 'admin-1', name: 'Bora', totalPoints: 20, order: 2, isActive: true, role: 'admin' },
    ])
    tasks.findMany.mockResolvedValue([
      { assistantId: 'user-1', points: 4, date: new Date('2026-07-01'), category: { name: 'Sınav' } },
      { assistantId: 'user-1', points: 2, date: new Date('2026-06-01'), category: null },
    ])
  })

  it('shows every department score but no task details to a regular user', async () => {
    session.mockResolvedValue({ id: 'user-1', name: 'Ada', role: 'user', department: 'GMIM' })

    const response = await GET(new Request('http://localhost/api/points'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canViewDetails).toBe(false)
    expect(data.people).toHaveLength(2)
    expect(data.people[0]).toEqual(expect.objectContaining({ name: 'Ada', totalPoints: 12, isCurrentUser: true }))
    expect(data.people[0]).not.toHaveProperty('details')
    expect(tasks.findMany).not.toHaveBeenCalled()
  })

  it('adds approved-task detail aggregates for managers', async () => {
    session.mockResolvedValue({ id: 'admin-1', name: 'Bora', role: 'admin', department: 'GMIM' })

    const response = await GET(new Request('http://localhost/api/points?department=GMIM'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canViewDetails).toBe(true)
    expect(data.people[0].details).toEqual(expect.objectContaining({ approvedTaskCount: 2, approvedPoints: 6, averagePoints: 3 }))
    expect(data.people[0].details.categories).toEqual([
      { name: 'Sınav', points: 4, count: 1 },
      { name: 'Diğer', points: 2, count: 1 },
    ])
    expect(tasks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assistant: { department: 'GMIM' }, status: 'approved' },
    }))
  })

  it('rejects cross-department access', async () => {
    session.mockResolvedValue({ id: 'admin-1', name: 'Bora', role: 'admin', department: 'GMIM' })

    const response = await GET(new Request('http://localhost/api/points?department=DUIM'))

    expect(response.status).toBe(403)
    expect(assistants.findMany).not.toHaveBeenCalled()
  })
})
