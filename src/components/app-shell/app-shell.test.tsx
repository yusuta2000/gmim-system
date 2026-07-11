import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/app-shell/app-shell'
import type { PortalSessionUser } from '@/lib/auth/session-repository'

vi.mock('next/navigation', () => ({
  usePathname: () => '/tasks',
}))

const user = (role: PortalSessionUser['role']): PortalSessionUser => ({
  id: `${role}-1`,
  name: 'Ada Lovelace',
  role,
  department: 'GMIM',
})

describe('AppShell', () => {
  it('renders the authenticated department context and stable work navigation', () => {
    const html = renderToStaticMarkup(
      <AppShell user={user('user')} department="GMIM"><h1>Görevler</h1></AppShell>,
    )

    expect(html).toContain('data-department="GMIM"')
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('href="/dashboard"')
    expect(html).toContain('href="/tasks"')
    expect(html).toContain('aria-current="page"')
    expect(html).not.toContain('href="/management/import"')
  })

  it('renders management links and minimum touch-target classes for managers', () => {
    const html = renderToStaticMarkup(
      <AppShell user={user('admin')} department="GMIM"><h1>Ana Sayfa</h1></AppShell>,
    )

    expect(html).toContain('href="/management/approvals"')
    expect(html).toContain('href="/management/import"')
    expect(html).toContain('min-h-11')
    expect(html).toContain('min-h-16')
    expect(html).toContain('pb-[env(safe-area-inset-bottom)]')
  })
})
