import { cookies } from 'next/headers'
import { hashSessionToken } from '@/lib/auth/session-token'
import { sessionRepository, type PortalSessionUser } from '@/lib/auth/session-repository'

export const SESSION_COOKIE = 'itudf_session'

export class UnauthenticatedError extends Error {
  constructor() {
    super('UNAUTHENTICATED')
  }
}

export function sessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

export function expiredSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export async function getSessionUser(): Promise<PortalSessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  return sessionRepository.findSessionUser(await hashSessionToken(token))
}

export async function requireSession(): Promise<PortalSessionUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthenticatedError()
  return user
}
