'use client'

import type { ReactNode } from 'react'
import { Ship } from 'lucide-react'
import { DesktopSidebar } from '@/components/navigation/desktop-sidebar'
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav'
import type { PortalSessionUser, SessionUser } from '@/lib/auth/session-repository'

type AppShellProps = {
  user: PortalSessionUser
  department: SessionUser['department']
  children: ReactNode
  utilityActions?: ReactNode
}

const departmentLabels: Record<SessionUser['department'], string> = {
  GMIM: 'Gemi Makineleri İşletme Mühendisliği',
  DUIM: 'Deniz Ulaştırma İşletme Mühendisliği',
}

export function AppShell({ user, department, children, utilityActions }: AppShellProps) {
  return (
    <div data-department={department} className="min-h-dvh bg-background text-foreground">
      <DesktopSidebar user={user} />
      <div className="min-h-dvh lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
                <Ship aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{department}</p>
                <p className="truncate text-xs text-text-secondary">{departmentLabels[department]}</p>
              </div>
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-sm font-semibold">{department}</p>
              <p className="truncate text-xs text-text-secondary">{departmentLabels[department]}</p>
            </div>
            {utilityActions && <div className="flex shrink-0 items-center gap-1.5">{utilityActions}</div>}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileBottomNav user={user} />
    </div>
  )
}
