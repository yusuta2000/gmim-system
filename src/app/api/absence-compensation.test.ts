import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (callback) => callback(db)),
    $executeRaw: vi.fn(),
    task: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {}
  return { requireSession: vi.fn(), UnauthenticatedError }
})

import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { GET, POST } from '@/app/api/absence-compensation/route'

const mocked = db as unknown as {
  task: Record<'groupBy' | 'findMany' | 'findFirst' | 'create', ReturnType<typeof vi.fn>>
  researchAssistant: Record<'findUnique' | 'findMany' | 'update', ReturnType<typeof vi.fn>>
  notification: Record<'create', ReturnType<typeof vi.fn>>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const returnee = { id: 'tarik', name: 'Tarık', department: 'GMIM', role: 'admin' }
const seeded = new Date('2026-01-01T00:00:00.000Z')
const colleagues = [
  { id: 'begum', name: 'Begüm', createdAt: seeded },
  { id: 'cenk', name: 'Cenk', createdAt: seeded },
  { id: 'away', name: 'Away', createdAt: seeded },
  { id: 'newbie', name: 'Newbie', createdAt: new Date('2026-08-01T00:00:00.000Z') },
]
const range = 'assistantId=tarik&start=2026-07-13&end=2026-10-09'

function post(body: unknown) {
  return POST(new Request('http://localhost/api/absence-compensation', { method: 'POST', body: JSON.stringify(body) }))
}

describe('absence compensation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue({ id: 'begum', role: 'admin', department: 'GMIM' })
    mocked.researchAssistant.findUnique.mockResolvedValue(returnee)
    mocked.researchAssistant.findMany.mockResolvedValue(colleagues)
    mocked.task.groupBy.mockResolvedValue([
      { assistantId: 'begum', _sum: { points: 45 } },
      { assistantId: 'cenk', _sum: { points: 30 } },
      { assistantId: 'away', _sum: { points: 2 } },
    ])
    mocked.task.findMany.mockResolvedValue([{ assistantId: 'away', notes: '[YURTDISI] 2026-09-01..2026-12-01' }])
    mocked.task.findFirst.mockResolvedValue({ number: 134 })
    mocked.task.create.mockResolvedValue({ id: 'task-new' })
  })

  it('takes the minimum of colleagues present for the whole range', async () => {
    const response = await GET(new Request(`http://localhost/api/absence-compensation?${range}`))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.minimum).toEqual({ id: 'cenk', name: 'Cenk', points: 30 })
    expect(data.rows.find((row: { id: string }) => row.id === 'away')).toMatchObject({ absentDuringRange: true, excluded: true })
    expect(data.rows.find((row: { id: string }) => row.id === 'newbie')).toMatchObject({ points: 0, joinedDuringRange: true, excluded: true })
    expect(mocked.task.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'approved', source: { not: 'absence_compensation' } }),
    }))
  })

  it('uses the manager-chosen exclusions when given', async () => {
    const response = await GET(new Request(`http://localhost/api/absence-compensation?${range}&excluded=cenk`))
    const data = await response.json()

    expect(data.minimum).toEqual({ id: 'newbie', name: 'Newbie', points: 0 })
  })

  it('adds an approved compensation task with the minimum points', async () => {
    const response = await post({ assistantId: 'tarik', start: '2026-07-13', end: '2026-10-09', excludedIds: ['away', 'newbie'], expectedPoints: 30 })

    expect(response.status).toBe(201)
    expect(mocked.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assistantId: 'tarik',
        number: 135,
        points: 30,
        status: 'approved',
        source: 'absence_compensation',
        date: new Date('2026-10-09T00:00:00.000Z'),
        notes: expect.stringContaining('[YURTDISI] 2026-07-13..2026-10-09'),
      }),
    })
    expect(mocked.researchAssistant.update).toHaveBeenCalledWith({ where: { id: 'tarik' }, data: { totalPoints: { increment: 30 } } })
  })

  it('refuses a second compensation for an overlapping range', async () => {
    mocked.task.findMany.mockResolvedValue([{ assistantId: 'tarik', notes: '[YURTDISI] 2026-07-13..2026-10-09' }])

    const response = await post({ assistantId: 'tarik', start: '2026-08-01', end: '2026-10-09', excludedIds: [], expectedPoints: 2 })

    expect(response.status).toBe(409)
    expect(mocked.task.create).not.toHaveBeenCalled()
  })

  it('refuses when points changed since the preview', async () => {
    const response = await post({ assistantId: 'tarik', start: '2026-07-13', end: '2026-10-09', excludedIds: ['away', 'newbie'], expectedPoints: 25 })

    expect(response.status).toBe(409)
    expect(mocked.task.create).not.toHaveBeenCalled()
  })

  it('rejects research assistants and reversed dates', async () => {
    requireSessionMock.mockResolvedValue({ id: 'cenk', role: 'user', department: 'GMIM' })
    expect((await GET(new Request(`http://localhost/api/absence-compensation?${range}`))).status).toBe(403)

    requireSessionMock.mockResolvedValue({ id: 'begum', role: 'admin', department: 'GMIM' })
    expect((await GET(new Request('http://localhost/api/absence-compensation?assistantId=tarik&start=2026-10-09&end=2026-07-13'))).status).toBe(400)
  })

  it('blocks managers of the other department', async () => {
    requireSessionMock.mockResolvedValue({ id: 'toprak', role: 'admin', department: 'DUIM' })
    expect((await GET(new Request(`http://localhost/api/absence-compensation?${range}`))).status).toBe(403)
  })
})
