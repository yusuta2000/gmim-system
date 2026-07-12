import { describe, expect, it } from 'vitest'
import { getNavigationItems, getPrimaryMobileItems } from '@/components/navigation/nav-config'
import type { SessionUser } from '@/lib/auth/session-repository'

const user = (role: SessionUser['role'], department: SessionUser['department'] = 'GMIM'): SessionUser => ({
  id: `${role}-${department}`,
  role,
  department,
})

describe('role-aware navigation', () => {
  it.each(['GMIM', 'DUIM'] as const)('keeps management destinations away from %s research assistants', (department) => {
    expect(getNavigationItems(user('user', department)).map((item) => item.href)).toEqual([
      '/dashboard', '/points', '/tasks', '/calendar', '/announcements',
    ])
  })

  it.each([
    ['admin', 'GMIM'], ['admin', 'DUIM'],
    ['baskan', 'GMIM'], ['baskan', 'DUIM'],
    ['dekan', 'GMIM'], ['dekan', 'DUIM'],
  ] as const)('shows management destinations to %s in %s', (role, department) => {
    const hrefs = getNavigationItems(user(role, department)).map((item) => item.href)

    expect(hrefs).toContain('/people')
    expect(hrefs).toContain('/management/approvals')
    expect(hrefs).toContain('/management/import')
    expect(hrefs).toContain('/management/categories')
    expect(hrefs).toContain('/management/periods')
  })

  it('limits the mobile bar to the three primary routes before the More control', () => {
    expect(getPrimaryMobileItems(user('admin')).map((item) => item.href)).toEqual([
      '/dashboard',
      '/tasks',
      '/calendar',
    ])
  })
})
