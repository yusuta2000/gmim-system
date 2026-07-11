import { describe, expect, it, vi } from 'vitest'
import { createSessionRepository } from '@/lib/auth/session-repository'

const expiresAt = new Date('2030-01-01T00:00:00.000Z')

function createClient() {
  return {
    session: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  }
}

describe('session repository', () => {
  it('stores only a token hash when creating a session', async () => {
    const client = createClient()
    client.session.create.mockResolvedValue({ id: 'session-1' })
    const repository = createSessionRepository(client as never)

    await repository.createSession({ userId: 'user-1', tokenHash: 'digest', expiresAt })

    expect(client.session.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', tokenHash: 'digest', expiresAt },
    })
  })

  it('returns a session user only when the stored session has not expired', async () => {
    const client = createClient()
    const repository = createSessionRepository(client as never)
    client.session.findFirst.mockResolvedValue({
      user: { id: 'user-1', name: 'Ada Lovelace', role: 'admin', department: 'GMIM' },
    })

    await expect(repository.findSessionUser('digest', new Date('2029-01-01T00:00:00.000Z')))
      .resolves.toEqual({ id: 'user-1', name: 'Ada Lovelace', role: 'admin', department: 'GMIM' })
    expect(client.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tokenHash: 'digest', expiresAt: { gt: new Date('2029-01-01T00:00:00.000Z') } },
    }))
  })

  it('revokes a session by its token hash', async () => {
    const client = createClient()
    const repository = createSessionRepository(client as never)

    await repository.deleteSession('digest')

    expect(client.session.deleteMany).toHaveBeenCalledWith({ where: { tokenHash: 'digest' } })
  })
})
