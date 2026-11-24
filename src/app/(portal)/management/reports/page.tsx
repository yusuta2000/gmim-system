import { getSessionUser } from '@/lib/auth/session'
import { ReportsScreen } from '@/features/reports/reports-screen'
import { isFixPlanOwner } from '@/features/reports/server/load-report'

export default async function ReportsPage() {
  const user = await getSessionUser()
  return <ReportsScreen showFixPlan={Boolean(user && (await isFixPlanOwner(user.id)))} />
}
