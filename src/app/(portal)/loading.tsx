import { Skeleton } from '@/components/ui/skeleton'

export default function PortalLoading() {
  return (
    <div className="min-h-dvh bg-background p-6 lg:pl-72" aria-label="Portal yükleniyor">
      <Skeleton className="h-12 w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <Skeleton className="mt-6 h-80 w-full" />
    </div>
  )
}
