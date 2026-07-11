import { afterEach, describe, expect, it } from 'vitest'
import { SESSION_COOKIE, expiredSessionCookie, sessionCookie } from '@/lib/auth/session'

const originalNodeEnv = process.env.NODE_ENV
const mutableEnv = process.env as { NODE_ENV?: string }

afterEach(() => {
  mutableEnv.NODE_ENV = originalNodeEnv
})

describe('session cookies', () => {
  it('creates an HttpOnly, same-site cookie with the session expiry', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z')

    expect(sessionCookie('opaque-token', expiresAt)).toMatchObject({
      name: SESSION_COOKIE,
      value: 'opaque-token',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
      secure: false,
    })
  })

  it('uses secure cookies in production and expires them on logout', () => {
    mutableEnv.NODE_ENV = 'production'

    expect(sessionCookie('opaque-token', new Date())).toMatchObject({ secure: true })
    expect(expiredSessionCookie()).toMatchObject({
      name: SESSION_COOKIE,
      value: '',
      httpOnly: true,
      maxAge: 0,
      path: '/',
    })
  })
})
