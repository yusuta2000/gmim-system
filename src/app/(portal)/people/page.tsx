import { redirect } from 'next/navigation'
import Home from '@/app/portal-client'
import { getSessionUser } from '@/lib/auth/session'

export default async function PeoplePage() {
  const user = await getSessionUser()
  if (!user || user.role === 'user') redirect('/tasks')
  return <Home initialView="personnel" />
}
