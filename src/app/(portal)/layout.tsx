import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { PortalLayoutClient } from '@/components/app-shell/portal-layout-client'
import { getSessionUser } from '@/lib/auth/session'

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/')

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <PortalLayoutClient user={user}>{children}</PortalLayoutClient>
    </Suspense>
  )
}
