import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { expiredSessionCookie, SESSION_COOKIE } from '@/lib/auth/session'
import { hashSessionToken } from '@/lib/auth/session-token'
import { sessionRepository } from '@/lib/auth/session-repository'

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token) await sessionRepository.deleteSession(await hashSessionToken(token))

  const response = NextResponse.json({ message: 'Çıkış yapıldı' })
  response.cookies.set(expiredSessionCookie())
  return response
}
