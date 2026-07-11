import { Suspense } from 'react'
import { TasksScreen } from '@/features/tasks/components/tasks-screen'
import { Skeleton } from '@/components/ui/skeleton'

export default function TasksPage() {
  return <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}><TasksScreen /></Suspense>
}
