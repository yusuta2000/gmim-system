import { AlertCircle, CheckCircle2, Clock3, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const statusStyles = {
  success: 'border-success/25 bg-success-muted text-success-foreground',
  warning: 'border-warning/30 bg-warning-muted text-warning-foreground',
  danger: 'border-destructive/25 bg-destructive-muted text-destructive-foreground',
  info: 'border-info/25 bg-info-muted text-info-foreground',
  neutral: 'border-border bg-surface-muted text-text-secondary',
} as const

const statusIcons = {
  success: CheckCircle2,
  warning: Clock3,
  danger: XCircle,
  info: Info,
  neutral: AlertCircle,
} as const

export type StatusBadgeProps = {
  status: keyof typeof statusStyles
  children: ReactNode
  className?: string
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const Icon = statusIcons[status]

  return (
    <span
      data-status={status}
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold',
        statusStyles[status],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{children}</span>
    </span>
  )
}
