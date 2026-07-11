import { describe, expect, it } from 'vitest'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import type { SessionUser } from '@/lib/auth/session-repository'

const cases: Array<[SessionUser['role'], SessionUser['department'], SessionUser['department'], boolean]> = [
  ['user', 'GMIM', 'GMIM', true], ['user', 'GMIM', 'DUIM', false],
  ['admin', 'GMIM', 'GMIM', true], ['admin', 'GMIM', 'DUIM', false],
  ['baskan', 'DUIM', 'GMIM', false], ['baskan', 'DUIM', 'DUIM', true],
  ['dekan', 'GMIM', 'GMIM', true], ['dekan', 'GMIM', 'DUIM', true],
]

describe('authorization policy', () => {
  it.each(cases)('%s in %s accessing %s is %s', (role, userDepartment, requestedDepartment, allowed) => {
    const user: SessionUser = { id: 'user-1', role, department: userDepartment }
    if (allowed) expect(() => assertDepartmentAccess(user, requestedDepartment)).not.toThrow()
    else expect(() => assertDepartmentAccess(user, requestedDepartment)).toThrow(AuthorizationError)
  })

  it('rejects roles outside the allowed list', () => {
    const user: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
    try {
      requireRole(user, ['admin'])
      throw new Error('Expected requireRole to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError)
      expect((error as AuthorizationError).code).toBe('FORBIDDEN')
    }
  })
})
