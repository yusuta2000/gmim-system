import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    researchAssistant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
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
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { PUT } from '@/app/api/change-password/route'

const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>
const verifyPasswordMock = verifyPassword as unknown as ReturnType<typeof vi.fn>
const hashPasswordMock = hashPassword as unknown as ReturnType<typeof vi.fn>

function request(body: unknown) {
  return new Request('http://localhost/api/change-password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue({ id: 'user-1', role: 'user', department: 'GMIM' })
    researchAssistant.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'stored-hash',
    })
    verifyPasswordMock.mockResolvedValue(true)
    hashPasswordMock.mockResolvedValue('new-hash')
    researchAssistant.update.mockResolvedValue({})
  })

  it('rejects unauthenticated requests before reading assistant ids from the body', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())

    const response = await PUT(request({
      assistantId: 'other-user',
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'UNAUTHENTICATED' })
    expect(researchAssistant.findUnique).not.toHaveBeenCalled()
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it('rejects the change when the current password hash does not verify', async () => {
    verifyPasswordMock.mockResolvedValue(false)

    const response = await PUT(request({
      assistantId: 'other-user',
      currentPassword: 'wrong-pass',
      newPassword: 'new-pass',
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Mevcut şifre hatalı' })
    expect(researchAssistant.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    expect(verifyPasswordMock).toHaveBeenCalledWith('stored-hash', 'wrong-pass')
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it('updates only the authenticated user password hash', async () => {
    const response = await PUT(request({
      assistantId: 'other-user',
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    }))

    expect(response.status).toBe(200)
    expect(hashPasswordMock).toHaveBeenCalledWith('new-pass')
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-hash' },
    })
  })
})
