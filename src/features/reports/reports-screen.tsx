'use client'

import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CHANGELOG } from '@/features/reports/changelog'
import type { ExamSupervisionReport, ReportGroup, ReportTask } from '@/features/reports/exam-supervision-report'

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

export function ReportsScreen() {
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
        </TabsList>
        <TabsContent value="changes" className="mt-4"><Changelog /></TabsContent>
        <TabsContent value="supervision" className="mt-4"><SupervisionChecklist /></TabsContent>
      </Tabs>
    </div>
  )
}
