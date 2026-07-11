import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    task: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    exam: { findMany: vi.fn() },
    pendingDutyChange: { count: vi.fn() },
  },
}))

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn(),
  UnauthenticatedError: class UnauthenticatedError extends Error {},
}))

import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { GET } from '@/app/api/dashboard/route'

const session = requireSession as unknown as ReturnType<typeof vi.fn>
const assistants = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
}
const tasks = db.task as unknown as {
  count: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
}
const exams = db.exam as unknown as { findMany: ReturnType<typeof vi.fn> }
const pendingDutyChanges = db.pendingDutyChange as unknown as { count: ReturnType<typeof vi.fn> }

describe('dashboard route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assistants.findUnique.mockResolvedValue({ id: 'user-1', name: 'Ada', role: 'user', department: 'GMIM', totalPoints: 14 })
    assistants.findMany.mockResolvedValue([
      { id: 'user-1', name: 'Ada', totalPoints: 14, order: 1 },
      { id: 'user-2', name: 'Bora', totalPoints: 20, order: 2 },
    ])
    assistants.count.mockResolvedValue(1)
    tasks.count.mockResolvedValue(2)
    tasks.findMany.mockResolvedValue([{
      id: 'task-1', description: 'Rapor', status: 'approved', date: new Date('2026-07-10'), points: 4,
      assistant: { name: 'Ada' },
    }])
    tasks.findFirst.mockResolvedValue(null)
    exams.findMany.mockResolvedValue([])
    pendingDutyChanges.count.mockResolvedValue(0)
  })

  it('returns a research-assistant dashboard scoped to the session user', async () => {
    session.mockResolvedValue({ id: 'user-1', name: 'Ada', role: 'user', department: 'GMIM' })
    tasks.findFirst.mockResolvedValue({ id: 'task-assigned', description: 'Yeni görev', points: 5 })

    const response = await GET(new Request('http://localhost/api/dashboard'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.kind).toBe('assistant')
    expect(data.priority).toEqual(expect.objectContaining({ href: '/tasks', label: 'Görevi incele' }))
    expect(data.metrics).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Toplam puan', value: 14 })]))
    expect(tasks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { assistantId: 'user-1' }, take: 5 }))
  })

  it('returns a department manager dashboard with pending work as the priority', async () => {
    session.mockResolvedValue({ id: 'admin-1', name: 'Yönetici', role: 'admin', department: 'GMIM' })
    tasks.count
      .mockResolvedValueOnce(24)
      .mockResolvedValueOnce(3)
    exams.findMany.mockResolvedValue([
      { id: 'exam-1', courseCode: 'GM101', date: new Date('2026-07-20'), requiredSupervisors: 2, supervisors: [] },
    ])
    pendingDutyChanges.count.mockResolvedValue(2)

    const response = await GET(new Request('http://localhost/api/dashboard?department=GMIM'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.kind).toBe('manager')
    expect(data.priority).toEqual(expect.objectContaining({ href: '/management/approvals', count: 3 }))
    expect(data.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Onay bekleyen', value: 3 }),
      expect.objectContaining({ label: 'Gözetmen açığı', value: 1 }),
    ]))
  })

  it('rejects a cross-department dashboard request', async () => {
    session.mockResolvedValue({ id: 'admin-1', name: 'Yönetici', role: 'admin', department: 'GMIM' })

    const response = await GET(new Request('http://localhost/api/dashboard?department=DUIM'))

    expect(response.status).toBe(403)
    expect(tasks.count).not.toHaveBeenCalled()
  })
})
