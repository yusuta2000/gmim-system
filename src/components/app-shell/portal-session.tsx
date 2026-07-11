'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PortalSessionUser } from '@/lib/auth/session-repository'

const PortalSessionContext = createContext<PortalSessionUser | null>(null)

export function PortalSessionProvider({ user, children }: { user: PortalSessionUser; children: ReactNode }) {
  return <PortalSessionContext.Provider value={user}>{children}</PortalSessionContext.Provider>
}

export function usePortalSession(): PortalSessionUser | null {
  return useContext(PortalSessionContext)
}
