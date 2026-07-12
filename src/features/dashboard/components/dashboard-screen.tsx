'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, RefreshCw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { portalHref, usePortalContext } from '@/components/app-shell/portal-context'
import { useDashboard } from '@/features/dashboard/queries/use-dashboard'
import type { DashboardData, DashboardTask } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

const statusLabels: Record<string, string> = {
  pending: 'Onay bekliyor',
  assigned: 'Yanıt bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

export function DashboardScreen() {
  const { user, department } = usePortalContext()
  const dashboard = useDashboard(department)

  if (dashboard.isPending) return <DashboardSkeleton />
  if (dashboard.isError) {
    return (
      <section className="mx-auto max-w-7xl" aria-labelledby="dashboard-error-title">
        <div className="rounded-xl border border-destructive/30 bg-destructive-muted p-6">
          <h1 id="dashboard-error-title" className="text-lg font-semibold text-destructive-foreground">Özet yüklenemedi</h1>
          <p className="mt-1 text-sm text-destructive-foreground">Bağlantıyı kontrol edip yeniden deneyin. Hiçbir veri değiştirilmedi.</p>
          <Button className="mt-4" variant="outline" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching}>
            <RefreshCw aria-hidden="true" /> Yeniden dene
          </Button>
        </div>
      </section>
    )
  }

  const data = dashboard.data
  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">{department} çalışma alanı</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Merhaba, {data.context.userName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {data.kind === 'manager' ? 'Bölümde dikkat gerektiren işleri ve güncel durumu görün.' : 'Görev, puan ve sınav durumunuzun kısa özeti.'}
          </p>
        </div>
        <p className="text-xs text-text-secondary">Son güncelleme {new Date(data.context.generatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
      </header>

      <section aria-labelledby="priority-title" className={cn(
        'flex flex-col gap-5 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6',
        data.priority.tone === 'warning' ? 'border-warning/35 bg-warning-muted' : 'border-border bg-surface',
      )}>
        <div className="flex min-w-0 gap-3">
          <span className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg', data.priority.tone === 'warning' ? 'bg-warning/15 text-warning-foreground' : 'bg-success-muted text-success-foreground')}>
            {data.priority.tone === 'warning' ? <AlertTriangle aria-hidden="true" className="size-5" /> : <CheckCircle2 aria-hidden="true" className="size-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="priority-title" className="font-semibold text-text-primary">{data.priority.title}</h2>
              {data.priority.count ? <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">{data.priority.count}</span> : null}
            </div>
            <p className="mt-1 text-sm text-text-secondary">{data.priority.description}</p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={portalHref(data.priority.href, user, department)}>{data.priority.label}<ArrowRight aria-hidden="true" /></Link>
        </Button>
      </section>

      <section aria-label="Temel göstergeler" className="grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <div key={metric.label} className={cn('px-5 py-4', index > 0 && 'border-t border-border sm:border-l', index === 2 && 'sm:border-l-0 lg:border-l', index > 1 && 'lg:border-t-0')}>
            <p className="text-sm text-text-secondary">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{metric.value}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{metric.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <RecentTasks tasks={data.recentTasks} tasksHref={portalHref('/tasks', user, department)} />
        <div className="min-w-0 space-y-6">
          {data.kind === 'manager' ? <Ranking data={data} /> : null}
          <UpcomingExams data={data} examsHref={portalHref('/calendar?domain=exams', user, department)} />
        </div>
      </div>
    </div>
  )
}

function RecentTasks({ tasks, tasksHref }: { tasks: DashboardTask[]; tasksHref: string }) {
  return (
    <section aria-labelledby="recent-tasks-title" className="min-w-0 rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2"><ClipboardList aria-hidden="true" className="size-4 text-primary" /><h2 id="recent-tasks-title" className="font-semibold">Son görev hareketleri</h2></div>
        <Button variant="ghost" size="sm" asChild><Link href={tasksHref}>Tümünü gör</Link></Button>
      </div>
      {tasks.length === 0 ? (
        <div className="px-5 py-10 text-center"><p className="text-sm font-medium">Henüz görev kaydı yok</p><p className="mt-1 text-sm text-text-secondary">Yeni görevler burada görünecek.</p></div>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-text-primary">{task.description}</p><p className="mt-1 text-xs text-text-secondary">{task.assistantName} · {dateFormatter.format(new Date(task.date))}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums">{task.points} puan</p><p className="mt-1 text-xs text-text-secondary">{statusLabels[task.status] || task.status}</p></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Ranking({ data }: { data: DashboardData }) {
  return (
    <section aria-labelledby="ranking-title" className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2"><Trophy aria-hidden="true" className="size-4 text-brand-gold" /><h2 id="ranking-title" className="font-semibold">Puan sıralaması</h2></div>
      {data.ranking.length === 0 ? <p className="mt-5 text-sm text-text-secondary">Sıralama verisi bulunmuyor.</p> : (
        <ol className="mt-4 space-y-3">{data.ranking.map((person, index) => <li key={person.id} className="flex items-center gap-3 text-sm"><span className="flex size-7 items-center justify-center rounded-md bg-surface-muted font-semibold tabular-nums">{index + 1}</span><span className="min-w-0 flex-1 truncate">{person.name}</span><span className="font-semibold tabular-nums">{person.totalPoints}</span></li>)}</ol>
      )}
    </section>
  )
}

function UpcomingExams({ data, examsHref }: { data: DashboardData; examsHref: string }) {
  return (
    <section aria-labelledby="upcoming-exams-title" className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4 text-primary" /><h2 id="upcoming-exams-title" className="font-semibold">Yaklaşan sınavlar</h2></div><Button variant="ghost" size="sm" asChild><Link href={examsHref}>Aç</Link></Button></div>
      {data.upcomingExams.length === 0 ? <p className="mt-5 text-sm text-text-secondary">Yaklaşan sınav bulunmuyor.</p> : (
        <ul className="mt-4 space-y-3">{data.upcomingExams.slice(0, 3).map((exam) => <li key={exam.id} className="flex items-center justify-between gap-3 text-sm"><div><p className="font-medium">{exam.courseCode}</p><p className="text-xs text-text-secondary">{dateFormatter.format(new Date(exam.date))}</p></div>{exam.supervisorGap > 0 ? <span className="rounded-md bg-warning-muted px-2 py-1 text-xs font-medium text-warning-foreground">{exam.supervisorGap} eksik</span> : null}</li>)}</ul>
      )}
    </section>
  )
}

function DashboardSkeleton() {
  return <div role="status" className="mx-auto max-w-7xl space-y-6" aria-label="Özet yükleniyor" aria-busy="true"><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-28 w-full rounded-xl" /><div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div></div>
}
