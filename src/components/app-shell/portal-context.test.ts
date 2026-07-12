import { describe, expect, it } from 'vitest'
import { departmentFromUrl, portalHref } from '@/components/app-shell/portal-context'
import type { SessionUser } from '@/lib/auth/session-repository'

const user = (role: SessionUser['role'], department: SessionUser['department'] = 'GMIM'): SessionUser => ({
  id: `${role}-1`,
  role,
  department,
})

describe('portal department URL context', () => {
  it('uses an explicit valid department only for the dean', () => {
    expect(departmentFromUrl(user('dekan'), 'DUIM')).toBe('DUIM')
    expect(departmentFromUrl(user('admin'), 'DUIM')).toBe('GMIM')
    expect(departmentFromUrl(user('user', 'DUIM'), 'GMIM')).toBe('DUIM')
  })

  it('falls back to the verified session department for invalid values', () => {
    expect(departmentFromUrl(user('dekan', 'GMIM'), 'INVALID')).toBe('GMIM')
    expect(departmentFromUrl(user('dekan', 'DUIM'), null)).toBe('DUIM')
  })

  it('keeps the dean department visible across navigation but omits it for other roles', () => {
    expect(portalHref('/tasks', user('dekan'), 'DUIM')).toBe('/tasks?department=DUIM')
    expect(portalHref('/calendar?domain=exams', user('dekan'), 'DUIM')).toBe('/calendar?domain=exams&department=DUIM')
    expect(portalHref('/tasks', user('admin'), 'GMIM')).toBe('/tasks')
    expect(portalHref('/calendar?domain=exams', user('baskan', 'DUIM'), 'DUIM')).toBe('/calendar?domain=exams')
  })
})
