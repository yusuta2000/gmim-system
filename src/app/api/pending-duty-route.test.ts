import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    pendingDutyChange: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    permanentDuty: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
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
import { GET, POST, PUT } from '@/app/api/pending-duty/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const pendingDutyChange = db.pendingDutyChange as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
}
const permanentDuty = db.permanentDuty as unknown as {
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const notification = db.notification as unknown as {
  create: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const assistant = { id: 'user-1', name: 'User One', department: 'GMIM' }
const change = {
  id: 'change-1',
  assistantId: 'user-1',
  changeType: 'add',
  dutyName: 'Duty',
  description: null,
  dutyId: null,
  assistant,
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/pending-duty', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('pending-duty route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    researchAssistant.findUnique.mockResolvedValue(assistant)
    researchAssistant.findMany.mockResolvedValue([{ id: 'admin-1' }])
    pendingDutyChange.findMany.mockResolvedValue([change])
    pendingDutyChange.findUnique.mockResolvedValue(change)
    pendingDutyChange.create.mockResolvedValue(change)
    pendingDutyChange.update.mockResolvedValue(change)
    permanentDuty.create.mockResolvedValue({})
    permanentDuty.update.mockResolvedValue({})
    permanentDuty.delete.mockResolvedValue({})
    notification.create.mockResolvedValue({})
  })

  it('GET rejects unauthenticated and non-manager access', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())
    const unauthenticated = await GET(new Request('http://localhost/api/pending-duty?department=GMIM'))
    expect(unauthenticated.status).toBe(401)

    requireSessionMock.mockResolvedValue(regularUser)
    const forbidden = await GET(new Request('http://localhost/api/pending-duty?department=GMIM'))
    expect(forbidden.status).toBe(403)
  })

  it('GET filters pending changes by an authorized department', async () => {
    const response = await GET(new Request('http://localhost/api/pending-duty?department=GMIM'))

    expect(response.status).toBe(200)
    expect(pendingDutyChange.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'pending', assistant: { department: 'GMIM' } },
    }))
  })

  it('GET rejects cross-department access for department managers', async () => {
    const response = await GET(new Request('http://localhost/api/pending-duty?department=DUIM'))

    expect(response.status).toBe(403)
    expect(pendingDutyChange.findMany).not.toHaveBeenCalled()
  })

  it('POST lets a user submit only their own duty change and ignores submittedBy', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await POST(postRequest({
      assistantId: 'user-1',
      changeType: 'add',
      dutyName: 'Duty',
      submittedBy: 'forged-user',
    }))

    expect(response.status).toBe(200)
    expect(pendingDutyChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ assistantId: 'user-1', submittedBy: 'user-1' }),
    })
  })

  it('POST rejects user submissions for another assistant', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    researchAssistant.findUnique.mockResolvedValue({ ...assistant, id: 'other-user' })

    const response = await POST(postRequest({
      assistantId: 'other-user',
      changeType: 'add',
      dutyName: 'Duty',
      submittedBy: 'user-1',
    }))

    expect(response.status).toBe(403)
    expect(pendingDutyChange.create).not.toHaveBeenCalled()
  })

  it('POST direct admin changes require a manager and department access', async () => {
    const response = await POST(postRequest({
      assistantId: 'user-1',
      changeType: 'add',
      dutyName: 'Duty',
      isDirectAdmin: true,
    }))

    expect(response.status).toBe(200)
    expect(permanentDuty.create).toHaveBeenCalledWith({
      data: { name: 'Duty', description: null, assistantId: 'user-1' },
    })
  })

  it('PUT ignores reviewerId and rejects cross-department review', async () => {
    pendingDutyChange.findUnique.mockResolvedValue({
      ...change,
      assistant: { ...assistant, department: 'DUIM' },
    })

    const response = await PUT(postRequest({
      changeId: 'change-1',
      action: 'approve',
      reviewerId: 'forged-admin',
    }))

    expect(response.status).toBe(403)
    expect(pendingDutyChange.update).not.toHaveBeenCalled()
  })

  it('PUT applies an approved change for an authorized manager', async () => {
    const response = await PUT(postRequest({
      changeId: 'change-1',
      action: 'approve',
      reviewerId: 'forged-admin',
    }))

    expect(response.status).toBe(200)
    expect(permanentDuty.create).toHaveBeenCalledWith({
      data: { name: 'Duty', description: null, assistantId: 'user-1' },
    })
    expect(pendingDutyChange.update).toHaveBeenCalledWith({
      where: { id: 'change-1' },
      data: { status: 'approved' },
    })
  })
})
