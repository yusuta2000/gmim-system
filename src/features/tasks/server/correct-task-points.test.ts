import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => {
  const db = {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    task: { findUnique: vi.fn(), updateMany: vi.fn() },
    researchAssistant: { update: vi.fn() },
    notification: { create: vi.fn() },
  }
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db))
  return { db }
})
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))

import { db } from '@/lib/db'
import { correctTaskPoints } from './task-service'

const mock = db as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>
  task: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> }
  researchAssistant: { update: ReturnType<typeof vi.fn> }
  notification: { create: ReturnType<typeof vi.fn> }
}
const requester = { id: 'tarik', role: 'admin' as const, department: 'GMIM' as const, name: 'Y.Tarık MUTLU' }
const baseTask = { id: 't1', assistantId: 'a1', description: 'Gözetmenlik: MAT101E - Matematik I', points: 4, status: 'approved', notes: '[SINAV] exam-1', assistant: { department: 'GMIM' }, category: null }
const input = { taskId: 't1', expectedPoints: 4, points: 2, categoryId: 'cat-pool', categoryName: 'Tuzla haftaiçi 1 sınav (havuz dersleri)', requester }

describe('correctTaskPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.$queryRaw.mockResolvedValue([{ exists: false }])
    mock.task.findUnique.mockResolvedValue(baseTask)
    mock.task.updateMany.mockResolvedValue({ count: 1 })
  })

  it('sets the barem points, keeps the exam link, moves the total by the difference and notifies the person', async () => {
    await correctTaskPoints(input)

    expect(mock.task.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', points: 4, status: 'approved' },
      data: expect.objectContaining({ points: 2, categoryId: 'cat-pool', notes: expect.stringMatching(/^\[SINAV\] exam-1\n\nPuan düzeltmesi .*4 → 2 puan/) }),
    })
    expect(mock.researchAssistant.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { totalPoints: { increment: -2 } } })
    expect(mock.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ assistantId: 'a1', title: 'Puan Düzeltildi' }) })
  })

  it('does not touch the total of a task that was not accepted yet', async () => {
    mock.task.findUnique.mockResolvedValue({ ...baseTask, status: 'assigned' })

    await correctTaskPoints(input)

    expect(mock.task.updateMany).toHaveBeenCalled()
    expect(mock.researchAssistant.update).not.toHaveBeenCalled()
  })

  it('refuses when the task changed in the meantime', async () => {
    mock.task.findUnique.mockResolvedValue({ ...baseTask, points: 5 })

    await expect(correctTaskPoints(input)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mock.task.updateMany).not.toHaveBeenCalled()
  })

  it('refuses tasks of a closed period', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ exists: true }]).mockResolvedValueOnce([{ status: 'closed' }])

    await expect(correctTaskPoints(input)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mock.researchAssistant.update).not.toHaveBeenCalled()
  })

  it('refuses non-managers and other departments', async () => {
    await expect(correctTaskPoints({ ...input, requester: { ...requester, role: 'user' } })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    mock.task.findUnique.mockResolvedValue({ ...baseTask, assistant: { department: 'DUIM' } })
    await expect(correctTaskPoints(input)).rejects.toThrow()
    expect(mock.task.updateMany).not.toHaveBeenCalled()
  })
})
