import { redirect } from 'next/navigation'
import PortalClient from '@/app/portal-client'
import { getSessionUser } from '@/lib/auth/session'

export default async function HomePage() {
  const user = await getSessionUser()
  if (user) redirect(user.role === 'user' ? '/tasks' : '/dashboard')

  return <PortalClient />
}
