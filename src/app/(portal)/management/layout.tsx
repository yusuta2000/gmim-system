import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user || user.role === 'user') redirect('/tasks')
  return children
}
