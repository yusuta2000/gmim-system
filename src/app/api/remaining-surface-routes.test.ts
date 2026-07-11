import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: {
      findMany: vi.fn(),
    },
    pointCategory: {
      findMany: vi.fn(),
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
import { GET as getAssistants } from '@/app/api/assistants/route'
import { POST as classifyTask } from '@/app/api/ai-classify/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const researchAssistant = db.researchAssistant as unknown as {
  findMany: ReturnType<typeof vi.fn>
}
const pointCategory = db.pointCategory as unknown as {
  findMany: ReturnType<typeof vi.fn>
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

describe('remaining API surface routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    researchAssistant.findMany.mockResolvedValue([{
      id: 'user-1',
      name: 'User One',
      password: 'plain',
      passwordHash: 'hash',
    }])
    pointCategory.findMany.mockResolvedValue([])
  })

  it('assistants GET requires a session', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await getAssistants(new Request('http://localhost/api/assistants?department=GMIM'))

    expect(response.status).toBe(401)
    expect(researchAssistant.findMany).not.toHaveBeenCalled()
  })

  it('assistants GET rejects cross-department access for department managers', async () => {
    const response = await getAssistants(new Request('http://localhost/api/assistants?department=DUIM'))

    expect(response.status).toBe(403)
    expect(researchAssistant.findMany).not.toHaveBeenCalled()
  })

  it('assistants GET lets regular users see their department point table and strips password material', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await getAssistants(new Request('http://localhost/api/assistants?department=GMIM'))

    expect(response.status).toBe(200)
    expect(researchAssistant.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { department: 'GMIM', role: { in: ['admin', 'user'] } },
    }))
    await expect(response.json()).resolves.toEqual([{
      id: 'user-1',
      name: 'User One',
    }])
  })

  it('assistants GET returns department members plus dekan for managers without password material', async () => {
    const response = await getAssistants(new Request('http://localhost/api/assistants?department=GMIM'))

    expect(response.status).toBe(200)
    expect(researchAssistant.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ department: 'GMIM' }, { role: 'dekan' }] },
    }))
    const payload = await response.json()
    expect(payload[0]).not.toHaveProperty('password')
    expect(payload[0]).not.toHaveProperty('passwordHash')
  })

  it('ai-classify requires a session before reading categories or calling the LLM', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await classifyTask(jsonRequest('/api/ai-classify', { taskDescription: 'Task' }))

    expect(response.status).toBe(401)
    expect(pointCategory.findMany).not.toHaveBeenCalled()
  })
})
