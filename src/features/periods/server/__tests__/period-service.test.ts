import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (callback) => callback(db)),
    academicPeriod: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    researchAssistant: {
      updateMany: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { PeriodServiceError, assertPeriodAllowsMutation, resetPeriod } from '../period-service'
import type { SessionUser } from '@/lib/auth/session-repository'

const academicPeriod = db.academicPeriod as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const researchAssistant = db.researchAssistant as unknown as {
  updateMany: ReturnType<typeof vi.fn>
}

const admin: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }

describe('period service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    academicPeriod.findUnique.mockResolvedValue({ id: 'period-1', status: 'open' })
    academicPeriod.findFirst.mockResolvedValue(null)
    academicPeriod.create.mockResolvedValue({ id: 'period-new' })
    academicPeriod.update.mockResolvedValue({})
    researchAssistant.updateMany.mockResolvedValue({ count: 1 })
  })

  it('rejects mutations in closed periods', async () => {
    academicPeriod.findUnique.mockResolvedValue({ id: 'period-1', status: 'closed' })

    await expect(assertPeriodAllowsMutation('period-1')).rejects.toBeInstanceOf(PeriodServiceError)
  })

  it('reset closes the current period and zeroes department points in one transaction', async () => {
    academicPeriod.findFirst.mockResolvedValue({ id: 'period-current', status: 'open', endsAt: null })

    await resetPeriod({ action: 'reset', department: 'GMIM', requester: admin })

    expect(academicPeriod.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'period-current' },
      data: expect.objectContaining({ status: 'closed', closedById: 'admin-1' }),
    }))
    expect(academicPeriod.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ department: 'GMIM', status: 'open' }),
    }))
    expect(researchAssistant.updateMany).toHaveBeenCalledWith({
      where: { department: 'GMIM' },
      data: { totalPoints: 0 },
    })
  })

  it('archive carries explicit points scoped to the department', async () => {
    await resetPeriod({
      action: 'archive',
      department: 'GMIM',
      requester: admin,
      carryOverPoints: { 'assistant-1': 12 },
    })

    expect(researchAssistant.updateMany).toHaveBeenCalledWith({
      where: { id: 'assistant-1', department: 'GMIM' },
      data: { totalPoints: 12 },
    })
  })
})
