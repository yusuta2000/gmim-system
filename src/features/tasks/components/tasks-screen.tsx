'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { TaskForm } from '@/features/tasks/components/task-form'
import { invalidateTaskRelatedQueries } from '@/features/tasks/queries/task-keys'
import { useTaskReferenceData } from '@/features/tasks/queries/use-task-reference-data'
import { useTasks } from '@/features/tasks/queries/use-tasks'
import type { TaskDto, TaskFilters, TaskStatus } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

const statusOptions: Array<{ value: TaskStatus | ''; label: string }> = [
  { value: '', label: 'Tüm durumlar' }, { value: 'pending', label: 'Onay bekliyor' }, { value: 'assigned', label: 'Yanıt bekliyor' }, { value: 'approved', label: 'Onaylandı' }, { value: 'rejected', label: 'Reddedildi' },
]
const statusStyle: Record<TaskStatus, string> = { pending: 'bg-warning-muted text-warning-foreground', assigned: 'bg-info-muted text-info-foreground', approved: 'bg-success-muted text-success-foreground', rejected: 'bg-destructive-muted text-destructive-foreground' }
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

export function TasksScreen() {
  const { user, department } = usePortalContext()
  const manager = user.role !== 'user'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const filters = useMemo<TaskFilters>(() => ({
    page: Math.max(1, Number(searchParams.get('page')) || 1), pageSize: 20,
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as TaskStatus) || undefined,
    assistantId: manager ? searchParams.get('assistantId') || undefined : undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }), [manager, searchParams])
  const tasks = useTasks(department, filters)
  const references = useTaskReferenceData(department, manager)

  function updateFilters(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (!('page' in updates)) next.delete('page')
    router.replace(`${pathname}?${next.toString()}`)
  }

  const hasFilters = Boolean(filters.search || filters.status || filters.assistantId || filters.categoryId || filters.dateFrom || filters.dateTo)
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">{department} çalışma alanı</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Görevler</h1><p className="mt-1 text-sm text-text-secondary">Görev kayıtlarını filtreleyin, izleyin ve tek yerden yönetin.</p></div>
        <Button onClick={() => setFormOpen(true)}><Plus aria-hidden="true" />{manager ? 'Görev oluştur' : 'Görev bildir'}</Button>
      </header>

      <section aria-label="Görev filtreleri" className="rounded-xl border border-border bg-surface p-4">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); updateFilters({ search: search.trim() || undefined }) }}>
          <div className="relative sm:col-span-2"><Search aria-hidden="true" className="absolute left-3 top-2.5 size-4 text-text-secondary" /><Input aria-label="Görevlerde ara" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Görev açıklamasında ara" /></div>
          <select aria-label="Duruma göre filtrele" value={filters.status || ''} onChange={(event) => updateFilters({ status: event.target.value || undefined })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          {manager ? <select aria-label="Kişiye göre filtrele" value={filters.assistantId || ''} onChange={(event) => updateFilters({ assistantId: event.target.value || undefined })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Tüm kişiler</option>{references.assistants.data?.map((assistant) => <option key={assistant.id} value={assistant.id}>{assistant.name}</option>)}</select> : null}
          <select aria-label="Kategoriye göre filtrele" value={filters.categoryId || ''} onChange={(event) => updateFilters({ categoryId: event.target.value || undefined })} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Tüm kategoriler</option>{references.categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <Input aria-label="Başlangıç tarihine göre filtrele" title="Başlangıç tarihi" type="date" value={filters.dateFrom || ''} max={filters.dateTo} onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })} />
          <Input aria-label="Bitiş tarihine göre filtrele" title="Bitiş tarihi" type="date" value={filters.dateTo || ''} min={filters.dateFrom} onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })} />
          <div className="flex gap-2"><Button type="submit" variant="secondary">Ara</Button>{hasFilters ? <Button type="button" variant="ghost" size="icon" aria-label="Filtreleri temizle" onClick={() => { setSearch(''); const departmentParam = user.role === 'dekan' ? `?department=${department}` : ''; router.replace(`${pathname}${departmentParam}`) }}><X aria-hidden="true" /></Button> : null}</div>
        </form>
      </section>

      <section aria-labelledby="task-results-title" className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5"><div><h2 id="task-results-title" className="font-semibold">Görev kayıtları</h2><p className="text-xs text-text-secondary">{tasks.data ? `${tasks.data.total} kayıt` : 'Yükleniyor'}</p></div>{tasks.isFetching && !tasks.isPending ? <Loader2 aria-label="Görevler güncelleniyor" className="size-4 animate-spin text-text-secondary" /> : null}</div>
        {tasks.isPending ? <TaskListSkeleton /> : tasks.isError ? <div className="px-5 py-12 text-center"><p className="font-medium">Görevler yüklenemedi</p><p className="mt-1 text-sm text-text-secondary">Bağlantıyı kontrol edip tekrar deneyin.</p><Button className="mt-4" variant="outline" onClick={() => tasks.refetch()}><RefreshCw aria-hidden="true" />Yeniden dene</Button></div> : tasks.data.items.length === 0 ? <div className="px-5 py-12 text-center"><ClipboardList aria-hidden="true" className="mx-auto size-8 text-text-secondary" /><p className="mt-3 font-medium">{hasFilters ? 'Filtrelere uyan görev yok' : 'Henüz görev kaydı yok'}</p><p className="mt-1 text-sm text-text-secondary">{hasFilters ? 'Filtreleri temizleyerek tüm kayıtları görebilirsiniz.' : 'İlk görev kaydı oluşturulduğunda burada görünecek.'}</p></div> : <TaskList items={tasks.data.items} userId={user.id} manager={manager} department={department} />}
        {tasks.data && tasks.data.totalPages > 1 ? <nav aria-label="Görev sayfaları" className="flex items-center justify-between border-t border-border px-4 py-3"><p className="text-sm text-text-secondary">Sayfa {tasks.data.page} / {tasks.data.totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={tasks.data.page <= 1} onClick={() => updateFilters({ page: String(tasks.data!.page - 1) })}><ChevronLeft aria-hidden="true" />Önceki</Button><Button variant="outline" size="sm" disabled={tasks.data.page >= tasks.data.totalPages} onClick={() => updateFilters({ page: String(tasks.data!.page + 1) })}>Sonraki<ChevronRight aria-hidden="true" /></Button></div></nav> : null}
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl"><DialogHeader className="border-b border-border px-5 py-4 pr-12"><DialogTitle>{manager ? 'Yeni görev oluştur' : 'Yeni görev bildir'}</DialogTitle><DialogDescription>{manager ? 'Bir araştırma görevlisine görev atayın veya onun adına kayıt bildirin.' : 'Tamamladığınız işi temsilci onayına gönderin.'}</DialogDescription></DialogHeader><div className="px-5 pb-5"><TaskForm onCancel={() => setFormOpen(false)} onSuccess={() => setFormOpen(false)} /></div></DialogContent>
      </Dialog>
    </div>
  )
}

function TaskList({ items, userId, manager, department }: { items: TaskDto[]; userId: string; manager: boolean; department: string }) {
  const queryClient = useQueryClient()
  const action = useMutation({
    mutationFn: async ({ task, operation }: { task: TaskDto; operation: 'accept' | 'reject' | 'delete' }) => {
      const response = operation === 'delete' ? await fetch(`/api/delete-task?id=${task.id}`, { method: 'DELETE' }) : await fetch('/api/respond-task', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId: task.id, action: operation }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'İşlem tamamlanamadı')
    },
    onSuccess: () => invalidateTaskRelatedQueries(queryClient, department),
  })
  return <ul className="divide-y divide-border">{items.map((task) => {
    const canRespond = !manager && task.assistantId === userId && task.status === 'assigned'
    return <li key={task.id} className="p-4 sm:px-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-text-primary">{task.description}</p><span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', statusStyle[task.status])}>{statusOptions.find((option) => option.value === task.status)?.label}</span></div><p className="mt-1 text-xs text-text-secondary">#{task.number} · {task.assistant.name} · {dateFormatter.format(new Date(task.date))}{task.category ? ` · ${task.category.name}` : ''}</p>{task.notes ? <p className="mt-2 text-sm text-text-secondary">{task.notes}</p> : null}</div><div className="flex items-center justify-between gap-3 lg:justify-end"><span className="font-semibold tabular-nums">{task.points} puan</span>{canRespond ? <div className="flex gap-2"><Button size="sm" onClick={() => action.mutate({ task, operation: 'accept' })} disabled={action.isPending}><Check aria-hidden="true" />Kabul</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ task, operation: 'reject' })} disabled={action.isPending}>Reddet</Button></div> : null}{manager ? <Button size="icon" variant="ghost" aria-label={`${task.description} görevini sil`} disabled={action.isPending} onClick={() => { if (window.confirm('Bu görev kaydı silinsin mi? Onaylanmış puan varsa geri alınır.')) action.mutate({ task, operation: 'delete' }) }}><Trash2 aria-hidden="true" /></Button> : null}</div></div>{action.isError && action.variables?.task.id === task.id ? <p role="alert" className="mt-2 text-sm text-destructive-foreground">{action.error instanceof Error ? action.error.message : 'İşlem tamamlanamadı'}</p> : null}</li>
  })}</ul>
}

function TaskListSkeleton() { return <div aria-label="Görevler yükleniyor" aria-busy="true" className="divide-y divide-border">{Array.from({ length: 5 }, (_, index) => <div key={index} className="space-y-2 p-5"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /></div>)}</div> }
