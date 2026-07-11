import type { SessionUser } from '@/lib/auth/session-repository'
import { AuthorizationError } from '@/lib/authorization/errors'

export function requireRole(user: SessionUser, roles: SessionUser['role'][]): void {
  if (!roles.includes(user.role)) throw new AuthorizationError('FORBIDDEN')
}
