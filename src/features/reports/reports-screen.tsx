'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AlertCircle, LoaderCircle, RefreshCw, Wrench } from 'lucide-react'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CHANGELOG } from '@/features/reports/changelog'
import type { ExamSupervisionReport, ReportGroup, ReportTask } from '@/features/reports/exam-supervision-report'
import type { FixPlan } from '@/features/reports/fix-plan'
import { pointsKeys } from '@/features/points/queries/use-points'
import { invalidateTaskRelatedQueries } from '@/features/tasks/queries/task-keys'

const STATUS: Record<string, string> = { approved: 'Kabul edildi', assigned: 'Kişinin yanıtı bekleniyor', pending: 'Temsilci onayı bekleniyor' }
const dateLabel = (day: string) => format(parseISO(day), 'd MMMM yyyy, EEEE', { locale: tr })

function TaskLine({ task }: { task: ReportTask }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-medium text-text-primary">{task.description}</span>
      {task.hoursWorked && <span className="text-text-secondary">{task.hoursWorked}</span>}
      <Badge variant="secondary">{task.points} puan</Badge>
      <Badge variant="outline">{STATUS[task.status] ?? task.status}</Badge>
      <Badge variant="outline">{task.fromCalendar ? "Takvim'den girilmiş" : 'Görevler ekranından girilmiş'}</Badge>
      {task.categoryName && <span className="text-text-secondary">Barem: {task.categoryName}</span>}
    </li>
  )
}

function Groups({ groups, empty }: { groups: ReportGroup[]; empty: string }) {
  if (!groups.length) return <p className="text-sm text-text-secondary">{empty}</p>
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={`${group.assistantName}-${group.day}`} className="rounded-lg border border-border p-3">
          <p className="mb-2 text-sm font-semibold">{group.assistantName} · {dateLabel(group.day)}</p>
          <ul className="space-y-2">{group.tasks.map((task) => <TaskLine key={task.id} task={task} />)}</ul>
        </div>
      ))}
    </div>
  )
}

function SupervisionChecklist() {
  const { department } = usePortalContext()
  const report = useQuery({
    queryKey: ['reports', 'exam-supervision', department],
    queryFn: async () => {
      const response = await fetch(`/api/reports/exam-supervision?department=${department}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Rapor alınamadı')
      return data as ExamSupervisionReport
    },
  })

  if (report.isLoading) return <div role="status" aria-label="Rapor yükleniyor" className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
  if (report.isError) {
    return <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Rapor alınamadı</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{report.error.message}</span><Button variant="outline" className="gap-2" onClick={() => report.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert>
  }
  const data = report.data!
  return (
    <div className="space-y-4">
      <Alert><AlertTitle>Bu liste hiçbir kaydı değiştirmez</AlertTitle><AlertDescription>{department} bölümünde {data.checkedTasks} sınav/gözetmenlik görevi incelendi. Düzeltmeleri Görevler ekranından elle yapın: fazla görevi silerseniz yalnız o görevin puanı düşer.</AlertDescription></Alert>
      <Card>
        <CardHeader><CardTitle className="text-base">1. Olası çift kayıt ({data.duplicates.length})</CardTitle><CardDescription>Aynı kişiye aynı gün aynı sınav için birden fazla görev yazılmış. Sınav hem Görevler ekranından hem Takvim'den girilmiş olabilir; fazla olanı silmeniz gerekir.</CardDescription></CardHeader>
        <CardContent><Groups groups={data.duplicates} empty="Olası çift kayıt bulunmadı." /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">2. Barem önerisinden farklı puanlı takvim görevleri ({data.mismatches.length})</CardTitle><CardDescription>Eskiden Takvim'den atanan her gözetmenliğe 4 puan yazılıyordu. Önerilen barem, sınavın gününe, saatine ve dersine göre sistemin bugün seçeceği barem kalemidir. Son karar temsilcinindir.</CardDescription></CardHeader>
        <CardContent>
          {data.mismatches.length ? (
            <ul className="space-y-2">
              {data.mismatches.map((row) => (
                <li key={row.task.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{row.assistantName} · {row.exam.courseName || row.exam.courseCode} sınavı · {dateLabel(row.day)}, {row.exam.timeSlot}</p>
                  <p className="mt-1 text-text-secondary">Yazılan puan: <strong className="text-text-primary">{row.task.points}</strong> ({STATUS[row.task.status] ?? row.task.status}). Bu sınav için önerilen barem: <strong className="text-text-primary">{row.suggested.name}, {row.suggested.points} puan</strong>. Fark: {row.suggested.points > row.task.points ? `${row.suggested.points - row.task.points} puan eksik yazılmış` : `${row.task.points - row.suggested.points} puan fazla yazılmış`}.</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-secondary">Farklı puanlı takvim görevi bulunmadı.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">3. Aynı gün birden fazla sınav ({data.sameDay.length})</CardTitle><CardDescription>Aynı kişinin aynı gün farklı sınavlarda görevi var. Bu genelde normaldir, sadece kontrol için listelenir.</CardDescription></CardHeader>
        <CardContent><Groups groups={data.sameDay} empty="Aynı gün birden fazla sınavı olan yok." /></CardContent>
      </Card>
    </div>
  )
}

const KIND_LABEL: Record<string, string> = { duplicate: 'Çift kayıt', wrongPoints: 'Yanlış puan', wrongPointsPending: 'Yanlış puan (henüz kabul edilmedi)' }

function FixPlanView() {
  const { department } = usePortalContext()
  const queryClient = useQueryClient()
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const plan = useQuery({
    queryKey: ['reports', 'fix-plan'],
    queryFn: async () => {
      const response = await fetch('/api/reports/fix-plan')
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Düzeltme planı alınamadı')
      return data as FixPlan
    },
  })
  const apply = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await fetch('/api/reports/fix-plan/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskIds }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Düzeltmeler uygulanamadı')
      return data as { message: string; skipped: { taskId: string; reason: string }[] }
    },
    onSuccess: async (data) => {
      setConfirming(false)
      setUnchecked(new Set())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: pointsKeys.department(department) }),
        invalidateTaskRelatedQueries(queryClient, department),
      ])
      if (data.skipped.length) toast.warning(`${data.message} Atlananlar: ${[...new Set(data.skipped.map((item) => item.reason))].join('; ')}`)
      else toast.success(data.message)
    },
    onError: (error) => toast.error(error.message),
  })

  if (plan.isLoading) return <div role="status" aria-label="Düzeltme planı yükleniyor" className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
  if (plan.isError) {
    return <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Düzeltme planı alınamadı</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{plan.error.message}</span><Button variant="outline" className="gap-2" onClick={() => plan.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert>
  }
  const data = plan.data!
  const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`)
  const pointsLabel = (value: number) => (value === 0 ? 'puan değişmez' : `${signed(value)} puan`)
  const selected = data.actions.filter((action) => !unchecked.has(action.taskId))
  const selectedPeople = [...selected.reduce((map, action) => map.set(action.assistantName, (map.get(action.assistantName) ?? 0) + action.pointChange), new Map<string, number>())]
  const toggle = (taskId: string) => setUnchecked((current) => {
    const next = new Set(current)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    return next
  })

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Bu sayfayı yalnız Tarık ve Sinan görüyor</AlertTitle>
        <AlertDescription>
          {dateLabel(data.since)} tarihinden bugüne kadar olan gözetmenlik kayıtlarına bakıldı. Sistemde iki hata vardı: Takvim&apos;den atanan her gözetmenliğe sınav ne olursa olsun 4 puan yazılıyordu, ve aynı sınav hem Görevler ekranından hem Takvim&apos;den girildiğinde kişi iki kez puan alabiliyordu.
          Aşağıda her hatalı kayıt için sorun ve önerilen düzeltme yazıyor. Doğru bulduğunuz satırları işaretli bırakıp &quot;Seçilenleri düzelt&quot; düğmesine basarsanız sistem bunları sizin yerinize uygular; yanlış bulduğunuz satırın işaretini kaldırın. Puanı düzeltilen kişiye bildirim gider ve görevin notuna kimin, ne zaman, kaç puandan kaç puana düzelttiği yazılır.
        </AlertDescription>
      </Alert>
      {data.actions.length === 0 ? (
        <p className="text-sm text-text-secondary">Bu tarihten sonra düzeltilmesi gereken bir kayıt bulunmadı.</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Kişi bazında özet</CardTitle><CardDescription>Tüm düzeltmeler yapılırsa kişinin toplam puanındaki değişim.</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {data.people.map((person) => (
                  <li key={person.assistantName} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{person.assistantName}</span>
                    <span className="text-text-secondary">{person.actions} düzeltme · <strong className="text-text-primary">{pointsLabel(person.pointChange)}</strong></span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yapılacak düzeltmeler ({data.actions.length})</CardTitle>
              <CardDescription>Her kayıt için sorun ve düğmenin ne yapacağı. Elle yapmak isterseniz adımları sırayla izleyebilirsiniz.</CardDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button type="button" className="min-h-11 gap-2" disabled={!selected.length || apply.isPending} onClick={() => setConfirming(true)}><Wrench className="size-4" aria-hidden="true" />Seçilenleri düzelt ({selected.length})</Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setUnchecked(new Set())}>Hepsini seç</Button>
                <Button type="button" variant="ghost" className="min-h-11" onClick={() => setUnchecked(new Set(data.actions.map((action) => action.taskId)))}>Seçimi kaldır</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.actions.map((action) => (
                <label key={action.taskId} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" className="mt-1 size-4 shrink-0" checked={!unchecked.has(action.taskId)} onChange={() => toggle(action.taskId)} aria-label={`${action.assistantName} ${dateLabel(action.day)} düzeltmesini seç`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{action.assistantName} · {dateLabel(action.day)}</span>
                      <Badge variant="outline">{KIND_LABEL[action.kind]}</Badge>
                      <Badge variant="secondary">{pointsLabel(action.pointChange)}</Badge>
                    </span>
                    <span className="mt-2 block"><span className="font-medium">Sorun:</span> {action.problem}</span>
                    <span className="mt-1 block"><span className="font-medium">Düğme ne yapar:</span> {action.fix.type === 'delete' ? 'Fazla görevi siler.' : `Görevin puanını ${action.fix.expectedPoints} puandan ${action.fix.points} puana, baremini "${action.fix.categoryName}" olarak düzeltir.`}</span>
                    <span className="mt-2 block text-text-secondary">Elle yapmak için:</span>
                    <ol className="list-decimal space-y-1 pl-5 text-text-secondary">{action.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
          <AlertDialog open={confirming} onOpenChange={(open) => !apply.isPending && setConfirming(open)}>
            <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>{selected.length} kayıt düzeltilsin mi?</AlertDialogTitle>
                <AlertDialogDescription>Kişilerin toplam puanı şöyle değişecek. Dönemi kapanmış veya bu arada değişmiş kayıtlar atlanır.</AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="divide-y divide-border text-sm">
                {selectedPeople.map(([name, change]) => <li key={name} className="flex justify-between gap-3 py-1.5"><span>{name}</span><strong>{pointsLabel(change)}</strong></li>)}
              </ul>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={apply.isPending}>Vazgeç</AlertDialogCancel>
                <AlertDialogAction disabled={apply.isPending} onClick={(event) => { event.preventDefault(); apply.mutate(selected.map((action) => action.taskId)) }}>{apply.isPending && <LoaderCircle className="size-4 animate-spin" />}Düzelt</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

function Changelog() {
  return (
    <div className="space-y-4">
      {CHANGELOG.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={entry.type === 'major' ? 'default' : 'secondary'}>{entry.type === 'major' ? 'Majör' : 'Minör'}</Badge>
              <span className="text-sm text-text-secondary">{dateLabel(entry.date)}</span>
            </div>
            <CardTitle className="text-base">{entry.title}</CardTitle>
            <CardDescription>{entry.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {entry.added.length > 0 && <section><h3 className="mb-1 font-semibold">Eklenenler</h3><ul className="list-disc space-y-1 pl-5">{entry.added.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            {entry.fixed.length > 0 && (
              <section>
                <h3 className="mb-1 font-semibold">Düzeltilen sorunlar</h3>
                <ul className="space-y-2">{entry.fixed.map((item) => <li key={item.before} className="rounded-lg border border-border p-3"><p><span className="font-medium">Eskiden:</span> {item.before}</p><p className="mt-1"><span className="font-medium">Şimdi:</span> {item.after}</p></li>)}</ul>
              </section>
            )}
            {entry.howTo.length > 0 && <section><h3 className="mb-1 font-semibold">Nasıl kullanılır</h3><ol className="list-decimal space-y-1 pl-5">{entry.howTo.map((item) => <li key={item}>{item}</li>)}</ol></section>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ReportsScreen({ showFixPlan = false }: { showFixPlan?: boolean }) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Raporlar</h1>
        <p className="mt-1 text-sm text-text-secondary">Sistemde yapılan değişiklikler ve kontrol listeleri.</p>
      </header>
      <Tabs defaultValue="changes">
        <TabsList className="min-h-11">
          <TabsTrigger value="changes">Değişiklikler</TabsTrigger>
          <TabsTrigger value="supervision">Gözetmenlik kontrol listesi</TabsTrigger>
          {showFixPlan && <TabsTrigger value="fix-plan">Düzeltme planı</TabsTrigger>}
        </TabsList>
        <TabsContent value="changes" className="mt-4"><Changelog /></TabsContent>
        <TabsContent value="supervision" className="mt-4"><SupervisionChecklist /></TabsContent>
        {showFixPlan && <TabsContent value="fix-plan" className="mt-4"><FixPlanView /></TabsContent>}
      </Tabs>
    </div>
  )
}
