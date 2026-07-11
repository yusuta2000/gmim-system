'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ship } from 'lucide-react'
import { portalHref, useOptionalPortalContext } from '@/components/app-shell/portal-context'
import { getNavigationItems } from '@/components/navigation/nav-config'
import { navigationIcons } from '@/components/navigation/navigation-icons'
import type { PortalSessionUser, SessionUser } from '@/lib/auth/session-repository'
import { cn } from '@/lib/utils'

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DesktopSidebar({ user }: { user: PortalSessionUser }) {
  const pathname = usePathname()
  const portalContext = useOptionalPortalContext()
  const items = getNavigationItems(user)
  const work = items.filter((item) => item.section === 'work')
  const management = items.filter((item) => item.section === 'management')

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex min-h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Ship aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">İTÜ Denizcilik</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">Ar.Gör Portalı</p>
        </div>
      </div>

      <nav aria-label="Ana navigasyon" className="flex-1 overflow-y-auto px-3 py-5">
        <NavigationSection label="Çalışma" items={work} pathname={pathname} user={user} department={portalContext?.department} />
        {management.length > 0 && (
          <NavigationSection label="Yönetim" items={management} pathname={pathname} user={user} department={portalContext?.department} className="mt-6" />
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="mt-1 text-xs text-sidebar-foreground/70">{roleLabel(user.role)}</p>
      </div>
    </aside>
  )
}

function NavigationSection({
  label,
  items,
  pathname,
  user,
  department,
  className,
}: {
  label: string
  items: ReturnType<typeof getNavigationItems>
  pathname: string
  user: PortalSessionUser
  department?: SessionUser['department']
  className?: string
}) {
  return (
    <section className={className} aria-labelledby={`nav-${label}`}>
      <h2 id={`nav-${label}`} className="px-3 text-xs font-semibold text-sidebar-foreground/60">
        {label}
      </h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const Icon = navigationIcons[item.icon]
          const active = isCurrent(pathname, item.href)
          return (
            <li key={item.id}>
              <Link
                href={department ? portalHref(item.href, user, department) : item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
                  'focus-visible:outline-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  active && 'bg-sidebar-accent text-sidebar-accent-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function roleLabel(role: SessionUser['role']): string {
  if (role === 'admin') return 'Temsilci'
  if (role === 'baskan') return 'Bölüm Başkanı'
  if (role === 'dekan') return 'Dekan'
  return 'Araştırma Görevlisi'
}
