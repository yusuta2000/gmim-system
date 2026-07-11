import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(),
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
import { hashPassword } from '@/lib/auth/password'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { PUT as resetPassword } from '@/app/api/reset-password/route'
import { PUT as toggleActive } from '@/app/api/toggle-active/route'
import { PUT as toggleRole } from '@/app/api/toggle-role/route'
import type { SessionUser } from '@/lib/auth/session-repository'

type RoutePut = (request: Request) => Promise<Response>

const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const notification = db.notification as unknown as {
  create: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const hashPasswordMock = hashPassword as unknown as ReturnType<typeof vi.fn>

function request(body: unknown) {
  return new Request('http://localhost/api/personnel-admin-route', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const targetAssistant = {
  id: 'target-1',
  name: 'Target User',
  role: 'user',
  department: 'GMIM',
}

const routeCases: Array<[string, RoutePut, unknown]> = [
  ['reset-password', resetPassword, { assistantId: 'target-1', newPassword: 'new-pass', requesterId: 'forged-admin' }],
  ['toggle-active', toggleActive, { assistantId: 'target-1', isActive: false }],
  ['toggle-role', toggleRole, { assistantId: 'target-1', requesterId: 'forged-admin' }],
]

describe('personnel admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    researchAssistant.findUnique.mockResolvedValue(targetAssistant)
    researchAssistant.update.mockResolvedValue(targetAssistant)
    notification.create.mockResolvedValue({})
    hashPasswordMock.mockResolvedValue('new-hash')
  })

  it.each(routeCases)('%s rejects unauthenticated requests before trusting body ids', async (_name, route, body) => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await route(request(body))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' })
    expect(researchAssistant.findUnique).not.toHaveBeenCalled()
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it.each(routeCases)('%s rejects non-manager sessions', async (_name, route, body) => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await route(request(body))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(researchAssistant.findUnique).not.toHaveBeenCalled()
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it.each(routeCases)('%s rejects cross-department target access for department managers', async (_name, route, body) => {
    researchAssistant.findUnique.mockResolvedValue({ ...targetAssistant, department: 'DUIM' })

    const response = await route(request(body))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'FORBIDDEN' })
    expect(researchAssistant.findUnique).toHaveBeenCalledWith({ where: { id: 'target-1' } })
    expect(researchAssistant.update).not.toHaveBeenCalled()
    expect(notification.create).not.toHaveBeenCalled()
  })

  it('reset-password writes only a password hash for the session-authorized department', async () => {
    const response = await resetPassword(request({
      assistantId: 'target-1',
      newPassword: 'new-pass',
      requesterId: 'forged-admin',
    }))

    expect(response.status).toBe(200)
    expect(hashPasswordMock).toHaveBeenCalledWith('new-pass')
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { passwordHash: 'new-hash' },
    })
    expect(notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assistantId: 'target-1' }),
    }))
  })

  it('toggle-active updates active state for the session-authorized department', async () => {
    const response = await toggleActive(request({
      assistantId: 'target-1',
      isActive: false,
    }))

    expect(response.status).toBe(200)
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { isActive: false },
    })
  })

  it('toggle-role ignores requesterId and toggles by the session user', async () => {
    const response = await toggleRole(request({
      assistantId: 'target-1',
      requesterId: 'forged-admin',
    }))

    expect(response.status).toBe(200)
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'target-1' },
      data: { role: 'admin' },
    })
  })

  it.each([
    ['toggle-active', toggleActive, { assistantId: 'target-1', isActive: false }],
    ['toggle-role', toggleRole, { assistantId: 'target-1' }],
  ])('%s never returns password material', async (_name, route, body) => {
    researchAssistant.update.mockResolvedValue({ ...targetAssistant, password: 'plain', passwordHash: 'hash' })

    const response = await route(request(body))
    const data = await response.json()

    expect(data.assistant).not.toHaveProperty('password')
    expect(data.assistant).not.toHaveProperty('passwordHash')
  })
})
