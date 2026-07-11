'use client'

import { useRef, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Award, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type Category = { id: string; name: string; points: number; description: string | null; isActive: boolean }
const categoryKey = ['management', 'categories'] as const

export function CategoriesScreen() {
  const queryClient = useQueryClient()
  const nameRef = useRef<HTMLInputElement>(null)
  const categories = useQuery({ queryKey: categoryKey, queryFn: async () => { const response = await fetch('/api/categories'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Puan baremleri alınamadı'); return data as Category[] } })
  const create = useMutation({ mutationFn: async (body: Record<string, unknown>) => { const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Barem eklenemedi'); return data }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: categoryKey }); toast.success('Puan baremi eklendi') }, onError: (error) => { toast.error(error.message); requestAnimationFrame(() => nameRef.current?.focus()) } })
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); create.mutate({ name: data.get('name'), points: Number(data.get('points')), description: data.get('description') }, { onSuccess: () => form.reset() }) }
  return <div className="space-y-6"><header><h1 className="text-2xl font-semibold tracking-tight">Puan baremleri</h1><p className="mt-1 text-sm text-text-secondary">Görev kategorilerini ve varsayılan puanlarını görüntüleyin.</p></header><Card><CardHeader><CardTitle className="text-lg">Yeni barem</CardTitle><CardDescription>Yeni görev kategorisi tüm bölümlerde kullanılabilir.</CardDescription></CardHeader><CardContent><form className="grid gap-4 md:grid-cols-[1fr_140px_1fr_auto]" onSubmit={submit}><div className="space-y-2"><Label htmlFor="category-name">Kategori adı *</Label><Input ref={nameRef} id="category-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="category-points">Puan *</Label><Input id="category-points" name="points" type="number" required /></div><div className="space-y-2"><Label htmlFor="category-description">Açıklama</Label><Input id="category-description" name="description" /></div><Button type="submit" className="min-h-11 self-end gap-2" disabled={create.isPending}>{create.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}Ekle</Button></form></CardContent></Card>{categories.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div> : categories.isError ? <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Baremler yüklenemedi</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{categories.error.message}</span><Button variant="outline" onClick={() => categories.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert> : categories.data?.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{categories.data.map((category) => <Card key={category.id}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><CardTitle className="text-base">{category.name}</CardTitle><Badge className="tabular-nums">{category.points} puan</Badge></div></CardHeader><CardContent className="text-sm text-text-secondary">{category.description || 'Açıklama yok.'}</CardContent></Card>)}</div> : <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><Award className="mx-auto size-8 text-text-secondary" /><h2 className="mt-3 font-semibold">Puan baremi yok</h2></div>}</div>
}
