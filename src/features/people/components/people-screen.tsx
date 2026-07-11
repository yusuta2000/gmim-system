'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, KeyRound, LoaderCircle, Plus, RefreshCw, Shield, Trash2, UserCheck, UserMinus, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { peopleKeys } from '@/features/people/queries/people-keys'
import { usePeople } from '@/features/people/queries/use-people'
import type { PersonDto } from '@/features/people/types'

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'İşlem tamamlanamadı')
  return data as T
}

function roleLabel(role: string, department: string) {
  if (role === 'admin') return 'Temsilci'
  if (role === 'baskan') return 'Bölüm Başkanı'
  if (role === 'dekan') return department === 'DUIM' ? 'Dekan & Bölüm Bşk.' : 'Dekan'
  return 'Ar.Gör.'
}

export function PeopleScreen() {
  const { department, user } = usePortalContext()
  const people = usePeople(department)
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<PersonDto | null>(null)
  const [removeTarget, setRemoveTarget] = useState<PersonDto | null>(null)
  const [dutyPerson, setDutyPerson] = useState<PersonDto | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: peopleKeys.list(department) })
  const addPerson = useMutation({
    mutationFn: (body: Record<string, unknown>) => requestJson<{ message: string }>('/api/add-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, department }) }),
    onSuccess: async (data) => { await refresh(); setAddOpen(false); toast.success(data.message) },
    onError: (error) => { toast.error(error.message); requestAnimationFrame(() => nameRef.current?.focus()) },
  })
  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => requestJson<{ message: string }>('/api/toggle-active', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assistantId: id, isActive }) }),
    onSuccess: async (data) => { await refresh(); toast.success(data.message) }, onError: (error) => toast.error(error.message),
  })
  const toggleRole = useMutation({
    mutationFn: (id: string) => requestJson<{ message: string }>('/api/toggle-role', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assistantId: id }) }),
    onSuccess: async (data) => { await refresh(); toast.success(data.message) }, onError: (error) => toast.error(error.message),
  })
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => requestJson<{ message: string }>('/api/reset-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assistantId: id, newPassword: password }) }),
    onSuccess: (data) => { setPasswordTarget(null); toast.success(data.message) }, onError: (error) => toast.error(error.message),
  })
  const removePerson = useMutation({
    mutationFn: (id: string) => requestJson<{ message: string }>(`/api/remove-assistant?id=${id}`, { method: 'DELETE' }),
    onSuccess: async (data) => { await refresh(); setRemoveTarget(null); toast.success(data.message) }, onError: (error) => toast.error(error.message),
  })
  const changeDuty = useMutation({
    mutationFn: (body: Record<string, unknown>) => requestJson<{ message: string }>('/api/pending-duty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, isDirectAdmin: true }) }),
    onSuccess: async (data) => { await refresh(); setDutyPerson(null); toast.success(data.message) }, onError: (error) => toast.error(error.message),
  })

  function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (addPerson.isPending) return
    const data = new FormData(event.currentTarget)
    addPerson.mutate({ name: data.get('name'), email: data.get('email'), password: data.get('password') || undefined })
  }

  const managers = people.data?.filter((person) => ['dekan', 'baskan'].includes(person.role)) || []
  const assistants = people.data?.filter((person) => ['admin', 'user'].includes(person.role)) || []

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Personel</h1><p className="mt-1 text-sm text-text-secondary">{department} personel hesaplarını ve daimi görevlerini yönetin.</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="min-h-11 gap-2"><Plus className="size-4" />Yeni araştırma görevlisi</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Yeni araştırma görevlisi</DialogTitle><DialogDescription>Kişi {department} bölümüne eklenir. Boş parola alanında sistem geçici parola üretir.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={submitAdd} noValidate><div className="space-y-2"><Label htmlFor="person-name">Ad soyad *</Label><Input ref={nameRef} id="person-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="person-email">E-posta *</Label><Input id="person-email" name="email" type="email" autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="person-password">Geçici parola</Label><Input id="person-password" name="password" type="password" autoComplete="new-password" minLength={4} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Vazgeç</Button><Button type="submit" disabled={addPerson.isPending}>{addPerson.isPending && <LoaderCircle className="size-4 animate-spin" />}Kişiyi ekle</Button></div></form></DialogContent>
        </Dialog>
      </header>

      {people.isLoading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div> : people.isError ? <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Personel yüklenemedi</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{people.error.message}</span><Button variant="outline" className="w-fit gap-2" onClick={() => people.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert> : (
        <>
          {managers.length > 0 && <section><h2 className="mb-3 text-sm font-semibold text-text-secondary">Bölüm yönetimi</h2><div className="grid gap-4 md:grid-cols-2">{managers.map((person) => <Card key={person.id}><CardHeader><div className="flex items-start gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-department-soft font-semibold text-department">{person.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><CardTitle className="text-base">{person.name}</CardTitle><CardDescription>{person.email}</CardDescription></div></div></CardHeader><CardContent><Badge variant="secondary" className="gap-1"><Shield className="size-3.5" />{roleLabel(person.role, department)}</Badge></CardContent></Card>)}</div></section>}
          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-text-secondary">Araştırma görevlileri ve temsilciler</h2><span className="text-sm text-text-secondary">{assistants.length} kişi</span></div>{assistants.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assistants.map((person) => {
            const busy = (toggleActive.isPending && toggleActive.variables?.id === person.id) || (toggleRole.isPending && toggleRole.variables === person.id)
            return <Card key={person.id} className={!person.isActive ? 'opacity-70' : undefined}><CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-base">{person.name}</CardTitle><CardDescription className="truncate">{person.email}</CardDescription></div><Badge variant={person.isActive ? 'outline' : 'destructive'}>{person.isActive ? 'Aktif' : 'Pasif'}</Badge></div><div className="flex flex-wrap gap-2 pt-2"><Badge variant="secondary">{roleLabel(person.role, department)}</Badge><Badge variant="outline">{person.faculty} · {person.department}</Badge></div></CardHeader><CardContent className="space-y-4"><div><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Daimi görevler</h3><Button type="button" variant="ghost" className="min-h-11 px-2 text-xs" onClick={() => setDutyPerson(person)}><Plus className="size-3.5" />Görev ekle</Button></div>{person.permanentDuties.length ? <ul className="mt-2 space-y-2">{person.permanentDuties.map((duty) => <li key={duty.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm"><span>{duty.name}</span><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-destructive" aria-label={`${duty.name} görevini sil`} disabled={changeDuty.isPending} onClick={() => changeDuty.mutate({ assistantId: person.id, changeType: 'delete', dutyName: duty.name, dutyId: duty.id })}><Trash2 className="size-4" /></Button></li>)}</ul> : <p className="mt-2 text-sm text-text-secondary">Daimi görev yok.</p>}</div><div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button type="button" variant="outline" className="min-h-11 gap-1.5" disabled={busy} onClick={() => toggleActive.mutate({ id: person.id, isActive: !person.isActive })}>{person.isActive ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}{person.isActive ? 'Pasif yap' : 'Aktif yap'}</Button><Button type="button" variant="outline" className="min-h-11 gap-1.5" disabled={busy || person.id === user.id} onClick={() => toggleRole.mutate(person.id)}><Shield className="size-4" />{person.role === 'admin' ? 'Temsilciliği kaldır' : 'Temsilci yap'}</Button><Button type="button" variant="outline" className="min-h-11 gap-1.5" onClick={() => setPasswordTarget(person)}><KeyRound className="size-4" />Parola sıfırla</Button>{person.role === 'user' && <Button type="button" variant="ghost" className="min-h-11 gap-1.5 text-destructive" onClick={() => setRemoveTarget(person)}><Trash2 className="size-4" />Kaldır</Button>}</div></CardContent></Card>
          })}</div> : <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><UserRound className="mx-auto size-8 text-text-secondary" /><h3 className="mt-3 font-semibold">Personel kaydı yok</h3><p className="mt-1 text-sm text-text-secondary">Yeni araştırma görevlisi ekleyerek başlayın.</p></div>}</section>
        </>
      )}

      <Dialog open={Boolean(dutyPerson)} onOpenChange={(open) => !open && setDutyPerson(null)}><DialogContent><DialogHeader><DialogTitle>Daimi görev ekle</DialogTitle><DialogDescription>{dutyPerson?.name} için görev adı girin.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const dutyName = String(new FormData(event.currentTarget).get('dutyName') || ''); if (dutyPerson && dutyName.trim()) changeDuty.mutate({ assistantId: dutyPerson.id, changeType: 'add', dutyName }) }}><div className="space-y-2"><Label htmlFor="duty-name">Görev adı *</Label><Input id="duty-name" name="dutyName" required /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDutyPerson(null)}>Vazgeç</Button><Button type="submit" disabled={changeDuty.isPending}>{changeDuty.isPending && <LoaderCircle className="size-4 animate-spin" />}Görevi ekle</Button></div></form></DialogContent></Dialog>

      <Dialog open={Boolean(passwordTarget)} onOpenChange={(open) => !open && setPasswordTarget(null)}><DialogContent><DialogHeader><DialogTitle>Parolayı sıfırla</DialogTitle><DialogDescription>{passwordTarget?.name} için en az dört karakterli geçici parola belirleyin.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const password = String(new FormData(event.currentTarget).get('password') || ''); if (passwordTarget) resetPassword.mutate({ id: passwordTarget.id, password }) }}><div className="space-y-2"><Label htmlFor="reset-person-password">Yeni parola *</Label><Input id="reset-person-password" name="password" type="password" autoComplete="new-password" minLength={4} required /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>Vazgeç</Button><Button type="submit" disabled={resetPassword.isPending}>{resetPassword.isPending && <LoaderCircle className="size-4 animate-spin" />}Parolayı sıfırla</Button></div></form></DialogContent></Dialog>

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Personeli sistemden kaldır?</AlertDialogTitle><AlertDialogDescription>{removeTarget?.name} ve ilişkili görev/program kayıtları kalıcı olarak silinecek. Pasife almak çoğu durumda daha güvenlidir.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={removePerson.isPending} onClick={() => removeTarget && removePerson.mutate(removeTarget.id)}>{removePerson.isPending && <LoaderCircle className="size-4 animate-spin" />}Kalıcı olarak kaldır</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  )
}
