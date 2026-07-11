import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { PeopleScreen } from '@/features/people/components/people-screen'

export default async function PeoplePage() {
  const user = await getSessionUser()
  if (!user || user.role === 'user') redirect('/tasks')
  return <PeopleScreen />
}
