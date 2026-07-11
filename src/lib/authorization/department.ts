import type { SessionUser } from '@/lib/auth/session-repository'
import { AuthorizationError } from '@/lib/authorization/errors'

export function assertDepartmentAccess(user: SessionUser, department: SessionUser['department']): void {
  if (user.role !== 'dekan' && user.department !== department) {
    throw new AuthorizationError('FORBIDDEN')
  }
}
