'use client'

import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell/app-shell'
import { PortalContextProvider, usePortalContext } from '@/components/app-shell/portal-context'
import { PortalQueryProvider } from '@/components/app-shell/query-provider'
import { PortalSessionProvider } from '@/components/app-shell/portal-session'
import { PortalToolbar } from '@/components/app-shell/portal-toolbar'
import type { PortalSessionUser } from '@/lib/auth/session-repository'

export function PortalLayoutClient({ user, children }: { user: PortalSessionUser; children: ReactNode }) {
  return (
    <PortalQueryProvider>
      <PortalSessionProvider user={user}>
        <PortalContextProvider user={user}>
          <PortalChrome>{children}</PortalChrome>
        </PortalContextProvider>
      </PortalSessionProvider>
    </PortalQueryProvider>
  )
}

function PortalChrome({ children }: { children: ReactNode }) {
  const { user, department } = usePortalContext()
  return (
    <AppShell user={user} department={department} utilityActions={<PortalToolbar />}>
      {children}
    </AppShell>
  )
}
