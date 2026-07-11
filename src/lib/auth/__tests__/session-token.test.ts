import { describe, expect, it } from 'vitest'
import { createSessionToken, hashSessionToken } from '@/lib/auth/session-token'

describe('session tokens', () => {
  it('creates unique URL-safe tokens and hashes them deterministically', async () => {
    const first = createSessionToken()
    const second = createSessionToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).not.toBe(first)
    await expect(hashSessionToken(first)).resolves.toMatch(/^[a-f0-9]{64}$/)
    await expect(hashSessionToken(first)).resolves.toBe(await hashSessionToken(first))
  })
})
