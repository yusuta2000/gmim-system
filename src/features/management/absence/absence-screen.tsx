'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, LoaderCircle, Plane } from 'lucide-react'
import { toast } from 'sonner'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePoints, pointsKeys } from '@/features/points/queries/use-points'
import { invalidateTaskRelatedQueries } from '@/features/tasks/queries/task-keys'
import type { AbsenceRow } from '@/features/tasks/server/absence-compensation'
import { cn } from '@/lib/utils'

type Preview = {
  assistant: { id: string; name: string }
  start: string
  end: string
  rows: AbsenceRow[]
  minimum: { id: string; name: string; points: number } | null
  alreadyCompensated: boolean
}

async function readJson(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'İşlem tamamlanamadı')
  return data
}

function rowNote(row: AbsenceRow) {
  if (row.absentDuringRange) return 'Bu aralıkta kendisi de yurtdışındaydı'
  if (row.joinedDuringRange) return 'Aralık içinde sisteme eklendi'
  return null
}

export function AbsenceScreen() {
  const { department } = usePortalContext()
  const points = usePoints(department)
  const queryClient = useQueryClient()
  const [assistantId, setAssistantId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const people = points.data?.people.filter((person) => person.isActive) || []

  const preview = useMutation({
    mutationFn: async (excludedIds?: string[]): Promise<Preview> => {
      const params = new URLSearchParams({ assistantId, start, end })
      if (excludedIds) params.set('excluded', excludedIds.join(','))
      return readJson(await fetch(`/api/absence-compensation?${params}`))
    },
  })
  const commit = useMutation({
    mutationFn: async (data: Preview) => readJson(await fetch('/api/absence-compensation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId: data.assistant.id,
        start: data.start,
        end: data.end,
        excludedIds: data.rows.filter((row) => row.excluded).map((row) => row.id),
        expectedPoints: data.minimum?.points,
      }),
    })),
    onSuccess: async (data) => {
      preview.reset()
      toast.success(data.message)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pointsKeys.department(department) }),
        invalidateTaskRelatedQueries(queryClient, department),
      ])
    },
    onError: (error) => toast.error(error.message),
  })

  const data = preview.data
  const toggle = (row: AbsenceRow) => {
    if (!data) return
    preview.mutate(data.rows.filter((item) => (item.id === row.id ? !item.excluded : item.excluded)).map((item) => item.id))
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Yurtdışı telafisi</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Yurtdışından dönen araştırma görevlisine, yokken bölümde tüm süre bulunanlardan en az puan alanın o aralıktaki puanı eklenir.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dönen kişi ve tarihler</CardTitle>
          <CardDescription>{department} bölümü · tarih aralığı gidiş ve dönüş günlerini kapsar</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="absence-person">Araştırma görevlisi</Label>
            <select id="absence-person" value={assistantId} onChange={(event) => { setAssistantId(event.target.value); preview.reset() }} className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Kişi seçin</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="absence-start">Gidiş tarihi</Label>
            <Input id="absence-start" type="date" value={start} onChange={(event) => { setStart(event.target.value); preview.reset() }} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="absence-end">Dönüş tarihi</Label>
            <Input id="absence-end" type="date" value={end} onChange={(event) => { setEnd(event.target.value); preview.reset() }} />
          </div>
          <Button className="min-h-11 gap-2" disabled={!assistantId || !start || !end || preview.isPending} onClick={() => preview.mutate(undefined)}>
            {preview.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Plane className="size-4" />}Hesapla
          </Button>
        </CardContent>
      </Card>

      {preview.isError ? (
        <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Hesaplanamadı</AlertTitle><AlertDescription>{preview.error.message}</AlertDescription></Alert>
      ) : null}

      {data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aralıkta kazanılan puanlar</CardTitle>
            <CardDescription>
              Onaylı görevler (gözetmenlik dahil) sayılır. İşaretsiz kişiler karşılaştırmaya girmez; gerekirse işareti değiştirin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.rows.map((row) => (
                <li key={row.id} className={cn('flex items-center gap-3 px-4 py-3', row.excluded && 'text-text-secondary')}>
                  <input type="checkbox" aria-label={`${row.name} karşılaştırmaya dahil`} checked={!row.excluded} disabled={preview.isPending} onChange={() => toggle(row)} className="size-4" />
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium', data.minimum?.id === row.id && 'text-primary')}>{row.name}{data.minimum?.id === row.id ? ' · en düşük' : ''}</p>
                    {rowNote(row) ? <p className="text-xs">{rowNote(row)}</p> : null}
                  </div>
                  <span className="font-semibold tabular-nums">{row.points} puan</span>
                </li>
              ))}
            </ul>

            {data.alreadyCompensated ? (
              <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Zaten eklenmiş</AlertTitle><AlertDescription>{data.assistant.name} için bu aralıkla çakışan bir telafi puanı zaten var.</AlertDescription></Alert>
            ) : data.minimum ? (
              <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm"><strong>{data.assistant.name}</strong> hesabına <strong className="tabular-nums">{data.minimum.points} puan</strong> eklenecek ({data.minimum.name}).</p>
                <Button className="min-h-11 gap-2" disabled={commit.isPending || preview.isPending} onClick={() => { if (window.confirm(`${data.assistant.name} hesabına ${data.minimum?.points} puan eklensin mi?`)) commit.mutate(data) }}>
                  {commit.isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}Telafi puanını ekle
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Karşılaştırmaya dahil kimse yok; en az bir kişiyi işaretleyin.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
