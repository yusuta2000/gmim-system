import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('password hashing', () => {
  it('hashes and verifies a password with Argon2id', async () => {
    const password = 'test-password-123'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
    await expect(verifyPassword(hash, 'different-password')).resolves.toBe(false)
  })
})
