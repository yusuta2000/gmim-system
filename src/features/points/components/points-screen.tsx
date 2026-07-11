'use client'

import { useState } from 'react'
import { ChevronDown, Download, RefreshCw, TableProperties, Target, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { usePoints } from '@/features/points/queries/use-points'
import type { PointPerson } from '@/features/points/types'
import { cn } from '@/lib/utils'

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

export function PointsScreen() {
  const { department } = usePortalContext()
  const points = usePoints(department)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (points.isPending) return <PointsSkeleton />
  if (points.isError) {
    return <section className="mx-auto max-w-6xl rounded-xl border border-destructive/30 bg-destructive-muted p-6"><h1 className="text-lg font-semibold text-destructive-foreground">Puan tablosu yüklenemedi</h1><p className="mt-1 text-sm text-destructive-foreground">Bağlantıyı kontrol edip yeniden deneyin.</p><Button className="mt-4" variant="outline" onClick={() => points.refetch()}><RefreshCw aria-hidden="true" />Yeniden dene</Button></section>
  }

  const data = points.data
  const activePeople = data.people.filter((person) => person.isActive)
  const inactivePeople = data.people.filter((person) => !person.isActive)
  const totalPoints = activePeople.reduce((sum, person) => sum + person.totalPoints, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">{department} çalışma alanı</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Puan Tablosu</h1><p className="mt-1 text-sm text-text-secondary">Düşük puanlı araştırma görevlileri görev dağılımında önceliklidir.</p></div>
        {data.canViewDetails ? <Button variant="outline" asChild><a href={`/api/export-excel?type=ranking&department=${department}`}><Download aria-hidden="true" />Excel indir</a></Button> : null}
      </header>

      <section aria-label="Puan tablosu özeti" className="grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-3">
        <Summary label="Aktif kişi" value={activePeople.length} detail="Araştırma görevlisi" />
        <Summary label="Toplam puan" value={totalPoints} detail="Aktif kişiler" bordered />
        <Summary label="Ortalama puan" value={activePeople.length ? Math.round(totalPoints / activePeople.length) : 0} detail="Kişi başına" bordered />
      </section>

      <section aria-labelledby="active-points-title" className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><TableProperties aria-hidden="true" className="size-4 text-primary" /><h2 id="active-points-title" className="font-semibold">Aktif araştırma görevlileri</h2></div><span className="text-xs text-text-secondary">En düşük puandan sıralı</span></div>
        {activePeople.length ? <ol className="divide-y divide-border">{activePeople.map((person, index) => <PointRow key={person.id} person={person} rank={index + 1} canViewDetails={data.canViewDetails} expanded={expandedId === person.id} onToggle={() => setExpandedId(expandedId === person.id ? null : person.id)} />)}</ol> : <p className="px-5 py-10 text-center text-sm text-text-secondary">Aktif araştırma görevlisi bulunmuyor.</p>}
      </section>

      {inactivePeople.length ? <section aria-labelledby="inactive-points-title" className="overflow-hidden rounded-xl border border-border bg-surface"><div className="border-b border-border px-5 py-4"><h2 id="inactive-points-title" className="font-semibold">Pasif kullanıcılar</h2><p className="mt-0.5 text-xs text-text-secondary">Sıralamaya dahil edilmez.</p></div><ul className="divide-y divide-border">{inactivePeople.map((person) => <PointRow key={person.id} person={person} canViewDetails={data.canViewDetails} expanded={expandedId === person.id} onToggle={() => setExpandedId(expandedId === person.id ? null : person.id)} />)}</ul></section> : null}
    </div>
  )
}

function Summary({ label, value, detail, bordered = false }: { label: string; value: number; detail: string; bordered?: boolean }) {
  return <div className={cn('px-5 py-4', bordered && 'border-t border-border sm:border-l sm:border-t-0')}><p className="text-sm text-text-secondary">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-text-secondary">{detail}</p></div>
}

function PointRow({ person, rank, canViewDetails, expanded, onToggle }: { person: PointPerson; rank?: number; canViewDetails: boolean; expanded: boolean; onToggle: () => void }) {
  const content = <><span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums', rank === 1 ? 'bg-success-muted text-success-foreground' : 'bg-surface-muted text-text-secondary')}>{rank || '–'}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-medium text-text-primary">{person.name}</span>{person.isCurrentUser ? <span className="rounded-md bg-info-muted px-2 py-0.5 text-xs font-medium text-info-foreground">Siz</span> : null}{person.role === 'admin' ? <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">Temsilci</span> : null}{!person.isActive ? <span className="rounded-md bg-destructive-muted px-2 py-0.5 text-xs font-medium text-destructive-foreground">Pasif</span> : null}</span>{rank === 1 ? <span className="mt-1 flex items-center gap-1 text-xs text-success-foreground"><Target aria-hidden="true" className="size-3" />Görev önceliği</span> : null}</span><span className="shrink-0 text-right"><span className="text-xl font-semibold tabular-nums">{person.totalPoints}</span><span className="ml-1 text-xs text-text-secondary">puan</span></span>{canViewDetails ? <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-text-secondary transition-transform', expanded && 'rotate-180')} /> : null}</>
  return <li className={cn(person.isCurrentUser && 'bg-info-muted/40', !person.isActive && 'opacity-70')}>
    {canViewDetails ? <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted/70 sm:px-5">{content}</button> : <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">{content}</div>}
    {canViewDetails && expanded && person.details ? <PointDetails person={person} /> : null}
  </li>
}

function PointDetails({ person }: { person: PointPerson }) {
  const details = person.details!
  const maxCategoryPoints = Math.max(...details.categories.map((category) => category.points), 1)
  return <div className="border-t border-border bg-surface-muted/45 px-4 py-4 sm:px-16"><div className="grid gap-3 sm:grid-cols-3"><DetailMetric label="Onaylı görev" value={details.approvedTaskCount.toString()} /><DetailMetric label="Kayıtlı görev puanı" value={details.approvedPoints.toString()} /><DetailMetric label="Görev başına ortalama" value={details.averagePoints.toFixed(1)} /></div><p className="mt-2 text-xs text-text-secondary">Ayrıntılar tüm onaylı görev kayıtlarını kapsar; ana satırdaki dönem toplamından farklı olabilir.</p><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto]"><div><h3 className="text-sm font-semibold">Kategori dağılımı</h3>{details.categories.length ? <ul className="mt-3 space-y-3">{details.categories.slice(0, 8).map((category) => <li key={category.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate">{category.name} <span className="text-text-secondary">({category.count} görev)</span></span><span className="font-semibold tabular-nums">{category.points} puan</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, category.points / maxCategoryPoints * 100)}%` }} /></div></li>)}</ul> : <p className="mt-2 text-sm text-text-secondary">Onaylı görev ayrıntısı bulunmuyor.</p>}</div><div className="flex items-start gap-2 text-xs text-text-secondary lg:min-w-48"><UserRound aria-hidden="true" className="mt-0.5 size-4" /><span>Son onaylı görev<br /><strong className="font-medium text-text-primary">{details.lastTaskDate ? dateFormatter.format(new Date(details.lastTaskDate)) : 'Bulunmuyor'}</strong></span></div></div></div>
}

function DetailMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-surface px-3 py-2"><p className="text-xs text-text-secondary">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p></div> }

function PointsSkeleton() { return <div className="mx-auto max-w-6xl space-y-5" aria-label="Puan tablosu yükleniyor" aria-busy="true"><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-[32rem] rounded-xl" /></div> }
