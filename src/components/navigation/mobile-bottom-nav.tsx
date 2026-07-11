'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { getMoreMobileItems, getPrimaryMobileItems } from '@/components/navigation/nav-config'
import { navigationIcons } from '@/components/navigation/navigation-icons'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { SessionUser } from '@/lib/auth/session-repository'
import { cn } from '@/lib/utils'

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileBottomNav({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const primaryItems = getPrimaryMobileItems(user)
  const moreItems = getMoreMobileItems(user)
  const moreActive = moreItems.some((item) => isCurrent(pathname, item.href))

  return (
    <nav
      aria-label="Mobil navigasyon"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2">
        {primaryItems.map((item) => {
          const Icon = navigationIcons[item.icon]
          const active = isCurrent(pathname, item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-text-secondary',
                'transition-colors duration-200 hover:text-text-primary focus-visible:outline-ring',
                active && 'text-department',
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-text-secondary',
                'transition-colors duration-200 hover:text-text-primary focus-visible:outline-ring',
                moreActive && 'text-department',
              )}
            >
              <Menu aria-hidden="true" className="size-5" />
              <span>Daha</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetHeader className="text-left">
              <SheetTitle>Diğer bölümler</SheetTitle>
              <SheetDescription>Rolünüze açık portal alanları.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-1 px-3 pb-3">
              {moreItems.map((item) => {
                const Icon = navigationIcons[item.icon]
                const active = isCurrent(pathname, item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
                      'hover:bg-surface-muted focus-visible:outline-ring',
                      active && 'bg-surface-muted text-department',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
