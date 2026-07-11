'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { PortalSessionUser, SessionUser } from '@/lib/auth/session-repository'

type Department = SessionUser['department']

type PortalContextValue = {
  user: PortalSessionUser
  department: Department
  setDepartment: (department: Department) => void
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function departmentFromUrl(user: SessionUser, value: string | null): Department {
  if (user.role === 'dekan' && (value === 'GMIM' || value === 'DUIM')) return value
  return user.department
}

export function portalHref(href: string, user: SessionUser, department: Department): string {
  if (user.role !== 'dekan') return href
  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}department=${department}`
}

export function PortalContextProvider({ user, children }: { user: PortalSessionUser; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const department = departmentFromUrl(user, searchParams.get('department'))

  const value = useMemo<PortalContextValue>(() => ({
    user,
    department,
    setDepartment: (nextDepartment) => {
      if (user.role !== 'dekan') return
      const next = new URLSearchParams(searchParams.toString())
      next.set('department', nextDepartment)
      next.delete('page')
      router.replace(`${pathname}?${next.toString()}`)
    },
  }), [department, pathname, router, searchParams, user])

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortalContext(): PortalContextValue {
  const context = useContext(PortalContext)
  if (!context) throw new Error('usePortalContext must be used inside PortalContextProvider')
  return context
}

export function useOptionalPortalContext(): PortalContextValue | null {
  return useContext(PortalContext)
}
