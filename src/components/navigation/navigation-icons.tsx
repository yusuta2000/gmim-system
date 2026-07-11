import {
  Award,
  CalendarDays,
  CheckCircle2,
  FileUp,
  Gauge,
  ListChecks,
  Megaphone,
  RotateCcw,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NavigationIcon } from '@/components/navigation/nav-config'

export const navigationIcons: Record<NavigationIcon, LucideIcon> = {
  dashboard: Gauge,
  tasks: ListChecks,
  calendar: CalendarDays,
  announcements: Megaphone,
  people: Users,
  approvals: CheckCircle2,
  import: FileUp,
  categories: Award,
  periods: RotateCcw,
}
