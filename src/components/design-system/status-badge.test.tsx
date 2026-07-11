import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '@/components/design-system/status-badge'

describe('StatusBadge', () => {
  it.each([
    ['success', 'Onaylandı'],
    ['warning', 'Onay bekliyor'],
    ['danger', 'Reddedildi'],
    ['info', 'Yanıt bekleniyor'],
    ['neutral', 'Taslak'],
  ] as const)('communicates %s status with text instead of color alone', (status, label) => {
    const html = renderToStaticMarkup(<StatusBadge status={status}>{label}</StatusBadge>)

    expect(html).toContain(`data-status="${status}"`)
    expect(html).toContain(label)
    expect(html).toContain('aria-hidden="true"')
  })
})
