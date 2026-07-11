import Home from '@/app/portal-client'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  return <Home initialView={view === 'schedule' ? 'schedule' : 'exams'} />
}
