'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  List,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { calendarKeys } from '@/features/calendar/queries/calendar-keys'
import { useCalendarExams, useWeeklySchedule } from '@/features/calendar/queries/use-calendar'
import type { CalendarDomain, CalendarExam, CalendarView, WeeklyScheduleEntry } from '@/features/calendar/types'
import { examBaremOptions, type BaremCategory } from '@/features/calendar/barem'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const DAY_NAMES: Record<number, string> = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi', 7: 'Pazar' }
const DAY_NUMBERS = Object.fromEntries(Object.entries(DAY_NAMES).map(([key, value]) => [value, Number(key)]))

type PersonOption = { id: string; name: string; role: string; isActive: boolean }

class RequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
  }
}

async function mutationJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = await response.json()
  if (!response.ok) throw new RequestError(data.message || data.error || 'İşlem tamamlanamadı', data.error)
  return data as T
}

type SupervisorPayload = { examId: string; assistantId: string; categoryId: string; confirm?: boolean }

function parseSlot(value: string): [number, number] | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  if (!match) return null
  return [Number(match[1]) * 60 + Number(match[2]), Number(match[3]) * 60 + Number(match[4])]
}

function overlaps(first: string, second: string) {
  const a = parseSlot(first)
  const b = parseSlot(second)
  return Boolean(a && b && a[0] < b[1] && a[1] > b[0])
}

function examConflict(exam: CalendarExam, schedules: WeeklyScheduleEntry[]) {
  const day = DAY_NUMBERS[exam.day]
  if (!day) return false
  const supervisorIds = new Set(exam.supervisors.map((item) => item.assistantId))
  return schedules.some((entry) => supervisorIds.has(entry.assistantId) && entry.dayOfWeek === day && overlaps(exam.timeSlot, entry.timeSlot))
}

function ExamCard({ exam, schedules, canManage, assigning, onAssign, people, adding, onAddSupervisor, categories, onDelete }: {
  exam: CalendarExam
  schedules: WeeklyScheduleEntry[]
  canManage: boolean
  assigning: boolean
  onAssign: (examId: string, categoryId: string) => void
  people: PersonOption[]
  adding: boolean
  onAddSupervisor: (examId: string, assistantId: string, categoryId: string) => void
  categories: BaremCategory[]
  onDelete: (exam: CalendarExam) => void
}) {
  const gap = Math.max(0, exam.requiredSupervisors - exam.supervisors.length)
  const conflict = examConflict(exam, schedules)
  const [candidate, setCandidate] = useState('')
  const candidates = people.filter((person) => person.isActive && ['user', 'admin'].includes(person.role) && !exam.supervisors.some((item) => item.assistantId === person.id))
  const barem = useMemo(() => examBaremOptions(categories, exam), [categories, exam])
  const [chosenCategory, setChosenCategory] = useState('')
  const categoryId = chosenCategory || (exam.categoryId && barem.options.some((option) => option.id === exam.categoryId) ? exam.categoryId : barem.suggestedId) || ''

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <h3 className="text-base font-semibold text-text-primary">{exam.courseCode} · {exam.courseName}</h3>
            {exam.instructor && <p className="text-sm text-text-secondary">{exam.instructor}</p>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{format(parseISO(exam.date), 'd MMMM yyyy, EEEE', { locale: tr })}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" aria-hidden="true" />{exam.timeSlot}</span>
            {exam.classroom && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{exam.classroom}</span>}
          </div>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 py-1 text-xs">
          <UserCheck className="size-3.5" aria-hidden="true" />{exam.supervisors.length}/{exam.requiredSupervisors} gözetmen
        </Badge>
      </div>

      {(gap > 0 || conflict) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {gap > 0 && <Badge variant="destructive" className="gap-1"><AlertCircle className="size-3.5" aria-hidden="true" />{gap} gözetmen eksik</Badge>}
          {conflict && <Badge variant="outline" className="gap-1 border-warning text-warning"><AlertTriangle className="size-3.5" aria-hidden="true" />Program çakışması var</Badge>}
        </div>
      )}

      {exam.supervisors.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-text-secondary">Atananlar</span>
          {exam.supervisors.map((item) => (
            <Badge key={item.id} variant={item.status === 'accepted' ? 'secondary' : 'outline'} className="gap-1">
              {item.status === 'accepted' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <Clock3 className="size-3.5" aria-hidden="true" />}
              {item.assistant.name} · {item.status === 'accepted' ? 'Kabul etti' : 'Yanıt bekleniyor'}
            </Badge>
          ))}
        </div>
      )}
      {exam.declined.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Reddedenler</span>
          {exam.declined.map((person) => <Badge key={person.id} variant="outline" className="border-destructive/40 text-destructive">{person.name}</Badge>)}
        </div>
      )}

      {exam.notes && <p className="mt-3 text-sm text-text-secondary">Not: {exam.notes}</p>}
      {canManage && gap > 0 && (
        <div className="mt-3 space-y-1">
          <Label htmlFor={`barem-${exam.id}`} className="text-xs font-medium text-text-secondary">Puan baremi (atanacak gözetmenlere yazılır)</Label>
          <select id={`barem-${exam.id}`} value={categoryId} onChange={(event) => setChosenCategory(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
            {!barem.options.length && <option value="">Barem bulunamadı</option>}
            {barem.options.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.points} puan{option.suggested ? ' (önerilen)' : ''}</option>)}
          </select>
        </div>
      )}
      {canManage && gap > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={assigning || !categoryId} onClick={() => onAssign(exam.id, categoryId)}>
            {assigning ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Zap className="size-4" aria-hidden="true" />}
            Uygun gözetmenleri ata
          </Button>
          <div className="flex min-w-0 gap-2">
            <select aria-label={`${exam.courseCode} için gözetmen seç`} value={candidate} onChange={(event) => setCandidate(event.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Kişi seçin</option>
              {candidates.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <Button type="button" className="min-h-11 gap-2" disabled={!candidate || !categoryId || adding} onClick={() => { onAddSupervisor(exam.id, candidate, categoryId); setCandidate('') }}>
              {adding ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}Gözetmen ekle
            </Button>
          </div>
        </div>
      )}
      {canManage && (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" className="min-h-11 gap-2 text-destructive" onClick={() => onDelete(exam)}><Trash2 className="size-4" aria-hidden="true" />Sınavı sil</Button>
        </div>
      )}
    </article>
  )
}

function EmptyState({ domain }: { domain: CalendarDomain }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
      {domain === 'exams' ? <GraduationCap className="mx-auto size-8 text-text-secondary" aria-hidden="true" /> : <CalendarDays className="mx-auto size-8 text-text-secondary" aria-hidden="true" />}
      <h3 className="mt-3 font-semibold">{domain === 'exams' ? 'Bu görünümde sınav yok' : 'Haftalık program kaydı yok'}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">{domain === 'exams' ? 'Tarih aralığını değiştirin veya yeni sınav ekleyin.' : 'Yetkili kullanıcılar program kaydı ekleyebilir.'}</p>
    </div>
  )
}

export function CalendarScreen() {
  const { department, user } = usePortalContext()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const canManage = user.role !== 'user'
  const domain = searchParams.get('domain') === 'schedule' ? 'schedule' : 'exams'
  const view = (['month', 'week', 'agenda'].includes(searchParams.get('view') || '') ? searchParams.get('view') : 'month') as CalendarView
  const selectedDate = useMemo(() => {
    const raw = searchParams.get('date')
    const parsed = raw ? parseISO(raw) : new Date()
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [searchParams])
  const exams = useCalendarExams(department)
  const schedule = useWeeklySchedule(department)
  const [examDialog, setExamDialog] = useState(false)
  const [scheduleDialog, setScheduleDialog] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const firstExamInput = useRef<HTMLInputElement>(null)

  const people = useQuery({
    queryKey: ['people', department, 'options'],
    queryFn: async () => mutationJson<PersonOption[]>(`/api/people?department=${department}&mode=options`, {}),
    enabled: canManage,
  })

  function replaceParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    router.replace(`/calendar?${next.toString()}`)
  }

  const createExam = useMutation({
    mutationFn: (payload: Record<string, unknown>) => mutationJson('/api/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, department }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: calendarKeys.exams(department) }); setExamDialog(false); toast.success('Sınav eklendi') },
    onError: (error) => { toast.error(error.message); requestAnimationFrame(() => firstExamInput.current?.focus()) },
  })
  const createSchedule = useMutation({
    mutationFn: (payload: Record<string, unknown>) => mutationJson('/api/weekly-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: calendarKeys.schedule(department) }); setScheduleDialog(false); toast.success('Program kaydı eklendi') },
    onError: (error) => toast.error(error.message),
  })
  const deleteSchedule = useMutation({
    mutationFn: (id: string) => mutationJson(`/api/weekly-schedule?id=${id}`, { method: 'DELETE' }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: calendarKeys.schedule(department) }); toast.success('Program kaydı silindi') },
    onError: (error) => toast.error(error.message),
  })
  const categories = useQuery({
    queryKey: ['calendar', 'categories'],
    queryFn: async () => mutationJson<(BaremCategory & { isActive: boolean })[]>('/api/categories', {}),
    select: (items) => items.filter((item) => item.isActive),
    enabled: canManage,
  })
  const [confirmSupervisor, setConfirmSupervisor] = useState<{ payload: SupervisorPayload; message: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarExam | null>(null)

  const assign = useMutation({
    mutationFn: (payload: { examId: string; categoryId: string }) => mutationJson<{ message: string }>('/api/supervisor-assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarKeys.exams(department) }),
        queryClient.invalidateQueries({ queryKey: ['points', department] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', department] }),
      ])
      toast.success(data.message)
    },
    onError: (error) => toast.error(error.message),
  })

  const addSupervisor = useMutation({
    mutationFn: (payload: SupervisorPayload) => mutationJson<{ message: string }>('/api/exam-supervisors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    onSuccess: async (data) => {
      setConfirmSupervisor(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarKeys.exams(department) }),
        queryClient.invalidateQueries({ queryKey: ['tasks', department] }),
      ])
      toast.success(data.message)
    },
    onError: (error, payload) => {
      if (error instanceof RequestError && error.code === 'CONFIRM_REQUIRED') {
        setConfirmSupervisor({ payload, message: error.message })
        return
      }
      toast.error(error.message)
    },
  })

  const deleteExam = useMutation({
    mutationFn: (id: string) => mutationJson<{ message: string }>(`/api/exams?id=${id}`, { method: 'DELETE' }),
    onSuccess: async (data) => {
      setDeleteTarget(null)
      setSelectedExamId(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: calendarKeys.exams(department) }),
        queryClient.invalidateQueries({ queryKey: ['tasks', department] }),
      ])
      toast.success(data.message)
    },
    onError: (error) => toast.error(error.message),
  })

  function renderExamCard(exam: CalendarExam) {
    return <ExamCard key={exam.id} exam={exam} schedules={schedule.data || []} canManage={canManage} assigning={assign.isPending && assign.variables?.examId === exam.id} onAssign={(examId, categoryId) => assign.mutate({ examId, categoryId })} people={people.data || []} adding={addSupervisor.isPending && addSupervisor.variables?.examId === exam.id} onAddSupervisor={(examId, assistantId, categoryId) => addSupervisor.mutate({ examId, assistantId, categoryId })} categories={categories.data || []} onDelete={setDeleteTarget} />
  }

  const deletePending = deleteTarget?.supervisors.filter((item) => item.status === 'pending').length ?? 0
  const deleteAccepted = deleteTarget?.supervisors.filter((item) => item.status === 'accepted').length ?? 0

  function submitExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    createExam.mutate({
      courseCode: data.get('courseCode'), courseName: data.get('courseName'), instructor: data.get('instructor'),
      date: data.get('date'), day: data.get('day'), timeSlot: data.get('timeSlot'), classroom: data.get('classroom'),
      requiredSupervisors: Number(data.get('requiredSupervisors')), notes: data.get('notes'),
    })
  }

  function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    createSchedule.mutate({ assistantId: data.get('assistantId'), dayOfWeek: Number(data.get('dayOfWeek')), timeSlot: data.get('timeSlot'), description: data.get('description') })
  }

  const sortedExams = useMemo(() => [...(exams.data || [])].sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot)), [exams.data])
  const selectedExam = sortedExams.find((exam) => exam.id === selectedExamId)
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
  }), [selectedDate])
  const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) }), [selectedDate])
  const visibleAgenda = view === 'week'
    ? sortedExams.filter((exam) => weekDays.some((day) => isSameDay(day, parseISO(exam.date))))
    : view === 'month'
      ? sortedExams.filter((exam) => isSameMonth(parseISO(exam.date), selectedDate))
      : sortedExams

  function navigateDate(direction: -1 | 1) {
    const next = view === 'month' ? (direction > 0 ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1)) : (direction > 0 ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1))
    replaceParams({ date: format(next, 'yyyy-MM-dd') })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Takvim</h1>
          <p className="mt-1 text-sm text-text-secondary">Sınavları ve haftalık programı aynı yerde, ayrı veri akışlarıyla yönetin.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={examDialog} onOpenChange={setExamDialog}>
              <DialogTrigger asChild><Button className="min-h-11 gap-2"><Plus className="size-4" aria-hidden="true" />Sınav ekle</Button></DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader><DialogTitle>Yeni sınav</DialogTitle><DialogDescription>{department} bölümüne sınav ekleyin. Zorunlu alanlar yıldızla işaretlidir.</DialogDescription></DialogHeader>
                <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitExam} noValidate>
                  <div className="space-y-2"><Label htmlFor="exam-code">Ders kodu *</Label><Input ref={firstExamInput} id="exam-code" name="courseCode" required /></div>
                  <div className="space-y-2"><Label htmlFor="exam-name">Ders adı *</Label><Input id="exam-name" name="courseName" required /></div>
                  <div className="space-y-2"><Label htmlFor="exam-instructor">Öğretim üyesi</Label><Input id="exam-instructor" name="instructor" /></div>
                  <div className="space-y-2"><Label htmlFor="exam-room">Sınıf</Label><Input id="exam-room" name="classroom" /></div>
                  <div className="space-y-2"><Label htmlFor="exam-date">Tarih *</Label><Input id="exam-date" name="date" type="date" required /></div>
                  <div className="space-y-2"><Label htmlFor="exam-day">Gün *</Label><Select name="day" required><SelectTrigger id="exam-day"><SelectValue placeholder="Gün seçin" /></SelectTrigger><SelectContent>{Object.values(DAY_NAMES).map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="exam-slot">Saat *</Label><Input id="exam-slot" name="timeSlot" placeholder="09:00-11:00" required /></div>
                  <div className="space-y-2"><Label htmlFor="exam-supervisors">Gerekli gözetmen *</Label><Input id="exam-supervisors" name="requiredSupervisors" type="number" min="1" max="20" defaultValue="1" required /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="exam-notes">Not</Label><Textarea id="exam-notes" name="notes" rows={3} /></div>
                  <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setExamDialog(false)}>Vazgeç</Button><Button type="submit" disabled={createExam.isPending}>{createExam.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Sınavı kaydet</Button></div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
              <DialogTrigger asChild><Button variant="outline" className="min-h-11 gap-2"><CalendarDays className="size-4" aria-hidden="true" />Program ekle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Haftalık program kaydı</DialogTitle><DialogDescription>Çakışma kontrolü kayıt sırasında sunucuda yapılır.</DialogDescription></DialogHeader>
                <form className="space-y-4" onSubmit={submitSchedule}>
                  <div className="space-y-2"><Label htmlFor="schedule-person">Araştırma görevlisi *</Label><Select name="assistantId" required disabled={people.isLoading}><SelectTrigger id="schedule-person"><SelectValue placeholder={people.isLoading ? 'Yükleniyor…' : 'Kişi seçin'} /></SelectTrigger><SelectContent>{people.data?.filter((person) => person.isActive && ['user', 'admin'].includes(person.role)).map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select>{people.isError && <p role="alert" className="text-sm text-destructive">Personel listesi alınamadı. Pencereyi kapatıp yeniden deneyin.</p>}</div>
                  <div className="space-y-2"><Label htmlFor="schedule-day">Gün *</Label><Select name="dayOfWeek" required><SelectTrigger id="schedule-day"><SelectValue placeholder="Gün seçin" /></SelectTrigger><SelectContent>{Object.entries(DAY_NAMES).map(([key, day]) => <SelectItem key={key} value={key}>{day}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="schedule-slot">Saat *</Label><Input id="schedule-slot" name="timeSlot" placeholder="09:00-11:00" required /></div>
                  <div className="space-y-2"><Label htmlFor="schedule-description">Ders veya açıklama *</Label><Input id="schedule-description" name="description" required /></div>
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setScheduleDialog(false)}>Vazgeç</Button><Button type="submit" disabled={createSchedule.isPending || people.isError}>{createSchedule.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Kaydet</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </header>

      <div role="group" aria-label="Takvim veri alanı" className="inline-flex min-h-11 w-full rounded-lg bg-muted p-[3px] sm:w-fit">
        <Button type="button" variant={domain === 'exams' ? 'secondary' : 'ghost'} className="flex-1 gap-2 shadow-none sm:flex-none" aria-pressed={domain === 'exams'} onClick={() => replaceParams({ domain: null })}><GraduationCap className="size-4" aria-hidden="true" />Sınavlar</Button>
        <Button type="button" variant={domain === 'schedule' ? 'secondary' : 'ghost'} className="flex-1 gap-2 shadow-none sm:flex-none" aria-pressed={domain === 'schedule'} onClick={() => replaceParams({ domain: 'schedule' })}><CalendarDays className="size-4" aria-hidden="true" />Haftalık program</Button>
      </div>

      {domain === 'exams' ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Önceki dönem" onClick={() => navigateDate(-1)}><ChevronLeft className="size-5" /></Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => replaceParams({ date: format(new Date(), 'yyyy-MM-dd') })}>Bugün</Button>
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Sonraki dönem" onClick={() => navigateDate(1)}><ChevronRight className="size-5" /></Button>
              <h2 className="ml-2 text-sm font-semibold capitalize sm:text-base">{view === 'week' ? `${format(weekDays[0], 'd MMM', { locale: tr })} – ${format(weekDays[6], 'd MMM yyyy', { locale: tr })}` : format(selectedDate, 'MMMM yyyy', { locale: tr })}</h2>
            </div>
            <div role="group" aria-label="Takvim görünümü" className="inline-flex min-h-11 w-full rounded-lg bg-muted p-[3px] sm:w-fit">
              <Button type="button" variant={view === 'month' ? 'secondary' : 'ghost'} className="flex-1 shadow-none" aria-pressed={view === 'month'} onClick={() => replaceParams({ view: null })}>Ay</Button>
              <Button type="button" variant={view === 'week' ? 'secondary' : 'ghost'} className="flex-1 shadow-none" aria-pressed={view === 'week'} onClick={() => replaceParams({ view: 'week' })}>Hafta</Button>
              <Button type="button" variant={view === 'agenda' ? 'secondary' : 'ghost'} className="flex-1 gap-1.5 shadow-none" aria-pressed={view === 'agenda'} onClick={() => replaceParams({ view: 'agenda' })}><List className="size-4" aria-hidden="true" />Ajanda</Button>
            </div>
          </div>

          {exams.isLoading ? <div role="status" className="space-y-3" aria-label="Sınavlar yükleniyor"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div> : exams.isError ? (
            <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Sınavlar yüklenemedi</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{exams.error.message}</span><Button variant="outline" className="w-fit gap-2" onClick={() => exams.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert>
          ) : view === 'month' ? (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
                <div className="grid grid-cols-7 border-b border-border bg-surface-muted">{Object.values(DAY_NAMES).map((day) => <div key={day} className="px-2 py-2 text-center text-xs font-medium text-text-secondary">{day}</div>)}</div>
                <div className="grid grid-cols-7">{monthDays.map((day) => {
                  const dayExams = sortedExams.filter((exam) => isSameDay(parseISO(exam.date), day))
                  return <div key={day.toISOString()} className="min-h-28 border-b border-r border-border p-2 last:border-r-0"><span className={isSameMonth(day, selectedDate) ? 'text-sm font-medium' : 'text-sm text-text-secondary'}>{format(day, 'd')}</span><div className="mt-2 space-y-1">{dayExams.slice(0, 3).map((exam) => <button type="button" key={exam.id} onClick={() => setSelectedExamId(exam.id)} aria-label={`${exam.courseCode} sınav ayrıntıları`} className="block w-full truncate rounded-md bg-department-soft px-2 py-1 text-left text-xs text-department hover:ring-1 hover:ring-department"><span className="font-semibold">{exam.timeSlot.split('-')[0]}</span> {exam.courseCode} <span className="opacity-80">{exam.supervisors.length}/{exam.requiredSupervisors}</span></button>)}{dayExams.length > 3 && <p className="px-1 text-xs text-text-secondary">+{dayExams.length - 3} sınav</p>}</div></div>
                })}</div>
              </div>
              <div className="space-y-3 md:hidden">{visibleAgenda.length ? visibleAgenda.map(renderExamCard) : <EmptyState domain="exams" />}</div>
            </>
          ) : view === 'week' ? (
            <>
              <div className="hidden grid-cols-7 gap-2 lg:grid">{weekDays.map((day) => { const items = sortedExams.filter((exam) => isSameDay(parseISO(exam.date), day)); return <section key={day.toISOString()} className="min-w-0 rounded-xl border border-border bg-surface p-3"><h3 className="text-sm font-semibold capitalize">{format(day, 'EEE d', { locale: tr })}</h3><div className="mt-3 space-y-2">{items.map((exam) => <button type="button" key={exam.id} onClick={() => setSelectedExamId(exam.id)} aria-label={`${exam.courseCode} sınav ayrıntıları`} className="block w-full rounded-lg bg-surface-muted p-2 text-left text-xs hover:ring-1 hover:ring-department"><p className="font-semibold text-text-primary">{exam.courseCode}</p><p className="mt-1 text-text-secondary">{exam.timeSlot}</p>{exam.classroom && <p className="text-text-secondary">{exam.classroom}</p>}<p className="mt-1 text-text-secondary">{exam.supervisors.length}/{exam.requiredSupervisors} gözetmen</p></button>)}{items.length === 0 && <p className="text-xs text-text-secondary">Sınav yok</p>}</div></section> })}</div>
              <div className="space-y-3 lg:hidden">{visibleAgenda.length ? visibleAgenda.map(renderExamCard) : <EmptyState domain="exams" />}</div>
            </>
          ) : (
            <div className="space-y-3">{visibleAgenda.length ? visibleAgenda.map(renderExamCard) : <EmptyState domain="exams" />}</div>
          )}
          <Dialog open={Boolean(selectedExam)} onOpenChange={(open) => { if (!open) setSelectedExamId(null) }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>Sınav ayrıntıları</DialogTitle><DialogDescription>Gözetmenler ve yanıt durumları</DialogDescription></DialogHeader>
              {selectedExam ? renderExamCard(selectedExam) : null}
            </DialogContent>
          </Dialog>
          <AlertDialog open={Boolean(confirmSupervisor)} onOpenChange={(open) => !open && setConfirmSupervisor(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Aynı gün başka sınav</AlertDialogTitle><AlertDialogDescription>{confirmSupervisor?.message}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction disabled={addSupervisor.isPending} onClick={(event) => { event.preventDefault(); if (confirmSupervisor) addSupervisor.mutate({ ...confirmSupervisor.payload, confirm: true }) }}>{addSupervisor.isPending && <LoaderCircle className="size-4 animate-spin" />}Yine de ata</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Sınavı sil?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.courseCode} · {deleteTarget?.courseName} takvimden silinecek. {deletePending ? `${deletePending} bekleyen gözetmenlik görevi kaldırılacak (puan verilmemişti). ` : ''}{deleteAccepted ? `${deleteAccepted} kabul edilmiş görev ve puanı korunacak; puanı düşürmek gerekiyorsa görevi Görevler ekranından ayrıca silin.` : ''}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteExam.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteExam.mutate(deleteTarget.id) }}>{deleteExam.isPending && <LoaderCircle className="size-4 animate-spin" />}Sınavı sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          {schedule.isError && <Alert><AlertTriangle className="size-4" /><AlertTitle>Çakışma bilgisi eksik olabilir</AlertTitle><AlertDescription>Haftalık program alınamadığı için sınav çakışmaları gösterilemiyor.</AlertDescription></Alert>}
        </>
      ) : schedule.isLoading ? <div role="status" aria-label="Haftalık program yükleniyor" className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : schedule.isError ? (
        <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Haftalık program yüklenemedi</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{schedule.error.message}</span><Button variant="outline" onClick={() => schedule.refetch()}>Yeniden dene</Button></AlertDescription></Alert>
      ) : schedule.data?.length ? (
        <div className="space-y-5">{Object.entries(DAY_NAMES).map(([dayNumber, dayName]) => {
          const entries = schedule.data.filter((entry) => entry.dayOfWeek === Number(dayNumber))
          if (!entries.length) return null
          return <section key={dayNumber}><h2 className="mb-2 text-sm font-semibold text-text-secondary">{dayName}</h2><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry) => <Card key={entry.id}><CardHeader className="pb-2"><CardTitle className="text-base">{entry.description}</CardTitle><CardDescription>{entry.assistant.name}</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm font-medium"><Clock3 className="size-4" />{entry.timeSlot}</span>{canManage && <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" aria-label={`${entry.description} programını sil`} disabled={deleteSchedule.isPending} onClick={() => deleteSchedule.mutate(entry.id)}><Trash2 className="size-4" /></Button>}</CardContent></Card>)}</div></section>
        })}</div>
      ) : <EmptyState domain="schedule" />}
    </div>
  )
}
