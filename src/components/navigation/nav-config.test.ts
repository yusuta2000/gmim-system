import { describe, expect, it } from 'vitest'
import { getNavigationItems, getPrimaryMobileItems } from '@/components/navigation/nav-config'
import type { SessionUser } from '@/lib/auth/session-repository'

const user = (role: SessionUser['role']): SessionUser => ({
  id: `${role}-1`,
  role,
  department: 'GMIM',
})

describe('role-aware navigation', () => {
  it('keeps management destinations away from research assistants', () => {
    expect(getNavigationItems(user('user')).map((item) => item.href)).toEqual([
      '/dashboard',
      '/points',
      '/tasks',
      '/calendar',
      '/announcements',
    ])
  })

  it.each(['admin', 'baskan', 'dekan'] as const)('shows management destinations to %s', (role) => {
    const hrefs = getNavigationItems(user(role)).map((item) => item.href)

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
