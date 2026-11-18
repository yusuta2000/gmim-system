import { describe, expect, it } from 'vitest'
import { pageHelpFor } from '@/components/app-shell/page-help-content'
import { getNavigationItems } from '@/components/navigation/nav-config'

describe('manager page help', () => {
  it('covers every page in the manager navigation', () => {
    const pages = getNavigationItems({ id: 'admin-1', role: 'admin', department: 'GMIM' }).map((item) => item.href)

    for (const href of pages) {
      const help = pageHelpFor(href)
      expect(help, href).not.toBeNull()
      expect(help?.items.length, href).toBeGreaterThan(0)
    }
  })

  it('matches nested paths and ignores unknown pages', () => {
    expect(pageHelpFor('/management/approvals/')?.title).toBe('Onaylar')
    expect(pageHelpFor('/bilinmeyen')).toBeNull()
  })
})
