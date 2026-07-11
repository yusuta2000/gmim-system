'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { useTaskReferenceData } from '@/features/tasks/queries/use-task-reference-data'
import { invalidateTaskRelatedQueries } from '@/features/tasks/queries/task-keys'

type TaskFormProps = { onSuccess: () => void; onCancel: () => void }

export function TaskForm({ onSuccess, onCancel }: TaskFormProps) {
  const { user, department } = usePortalContext()
  const manager = user.role !== 'user'
  const queryClient = useQueryClient()
  const { assistants, categories } = useTaskReferenceData(department, manager)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const [error, setError] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const selectedCategory = categories.data?.find((category) => category.id === categoryId)

  useEffect(() => { descriptionRef.current?.focus() }, [])

  const createTask = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.error || 'Görev kaydedilemedi')
      return data
    },
    onSuccess: async () => {
      await invalidateTaskRelatedQueries(queryClient, department)
      onSuccess()
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Görev kaydedilemedi')
      descriptionRef.current?.focus()
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const description = String(form.get('description') || '').trim()
    if (description.length < 3) {
      setError('Görev açıklaması en az 3 karakter olmalı.')
      descriptionRef.current?.focus()
      return
    }
    createTask.mutate({
      description,
      date: form.get('date'),
      assistantId: manager ? form.get('assistantId') : user.id,
      categoryId: categoryId || null,
      points: selectedCategory ? selectedCategory.points : Number(form.get('points') || 0),
      hoursWorked: String(form.get('hoursWorked') || '').trim() || null,
      notes: String(form.get('notes') || '').trim() || null,
      kind: manager ? form.get('kind') : 'report',
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive-muted px-3 py-2 text-sm text-destructive-foreground">{error}</div> : null}

      {manager ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">İşlem türü</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"><input type="radio" name="kind" value="assign" defaultChecked /> Görev ata</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"><input type="radio" name="kind" value="report" /> Kayıt bildir</label>
          </div>
        </fieldset>
      ) : null}

      {manager ? (
        <div className="space-y-2">
          <Label htmlFor="task-assistant">Araştırma görevlisi</Label>
          <select id="task-assistant" name="assistantId" required disabled={assistants.isPending || assistants.isError} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Kişi seçin</option>
            {assistants.data?.map((assistant) => <option key={assistant.id} value={assistant.id}>{assistant.name}</option>)}
          </select>
          {assistants.isError ? <p className="text-xs text-destructive-foreground">Kişi listesi alınamadı. Formu kapatıp yeniden deneyin.</p> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="task-description">Görev açıklaması</Label>
        <Textarea ref={descriptionRef} id="task-description" name="description" required minLength={3} maxLength={1000} rows={4} placeholder="Yapılan işi açık ve kısa biçimde yazın" aria-describedby="task-description-help" />
        <p id="task-description-help" className="text-xs text-text-secondary">Onaylayacak kişinin görevi anlayabileceği ayrıntıyı ekleyin.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="task-date">Tarih</Label><Input id="task-date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        <div className="space-y-2"><Label htmlFor="task-hours">Çalışma süresi</Label><Input id="task-hours" name="hoursWorked" maxLength={100} placeholder="Örn. 3 saat" /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="task-category">Puan kategorisi</Label>
          <select id="task-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categories.isPending || categories.isError} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Kategori yok</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.points} puan)</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="task-points">Puan</Label><Input id="task-points" name="points" type="number" min={0} max={1000} defaultValue={0} disabled={Boolean(selectedCategory)} /><p className="text-xs text-text-secondary">{selectedCategory ? 'Kategori puanı sunucuda uygulanır.' : 'Kategori yoksa manuel puan.'}</p></div>
      </div>

      <div className="space-y-2"><Label htmlFor="task-notes">Not (isteğe bağlı)</Label><Textarea id="task-notes" name="notes" maxLength={1000} rows={2} /></div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createTask.isPending}>Vazgeç</Button>
        <Button type="submit" disabled={createTask.isPending || (manager && (assistants.isPending || assistants.isError))}>
          {createTask.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {manager ? 'Görevi kaydet' : 'Onaya gönder'}
        </Button>
      </div>
    </form>
  )
}
