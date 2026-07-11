import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { PortalSessionProvider } from '@/components/app-shell/portal-session'
import { getSessionUser } from '@/lib/auth/session'

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/')

  return <PortalSessionProvider user={user}>{children}</PortalSessionProvider>
}
