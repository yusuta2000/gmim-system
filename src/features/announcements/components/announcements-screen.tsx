'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AlertCircle, LoaderCircle, MessageSquare, RefreshCw, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { usePortalContext } from '@/components/app-shell/portal-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { announcementKeys } from '@/features/announcements/queries/announcement-keys'
import { useAnnouncements } from '@/features/announcements/queries/use-announcements'
import type { AnnouncementDto } from '@/features/announcements/types'

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || data.error || 'İşlem tamamlanamadı')
  return data as T
}

function roleName(role: string) {
  if (role === 'admin') return 'Temsilci'
  if (role === 'baskan') return 'Bölüm Başkanı'
  if (role === 'dekan') return 'Dekan'
  return 'Ar.Gör.'
}

export function AnnouncementsScreen() {
  const { department, user } = usePortalContext()
  const queryClient = useQueryClient()
  const announcements = useAnnouncements(department)
  const canManage = user.role !== 'user'
  const [comments, setComments] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDto | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const createAnnouncement = useMutation({
    mutationFn: (payload: { title: string; content: string }) => requestJson('/api/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, department }),
    }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: announcementKeys.list(department) }); toast.success('Duyuru yayınlandı') },
    onError: (error) => { toast.error(error.message); requestAnimationFrame(() => titleRef.current?.focus()) },
  })
  const addComment = useMutation({
    mutationFn: ({ announcementId, content }: { announcementId: string; content: string }) => requestJson('/api/announcements', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcementId, content }),
    }),
    onSuccess: async (_data, variables) => {
      setComments((current) => ({ ...current, [variables.announcementId]: '' }))
      await queryClient.invalidateQueries({ queryKey: announcementKeys.list(department) })
      toast.success('Yorum eklendi')
    },
    onError: (error) => toast.error(error.message),
  })
  const deleteAnnouncement = useMutation({
    mutationFn: (id: string) => requestJson(`/api/announcements?id=${id}`, { method: 'DELETE' }),
    onSuccess: async () => { setDeleteTarget(null); await queryClient.invalidateQueries({ queryKey: announcementKeys.list(department) }); toast.success('Duyuru silindi') },
    onError: (error) => toast.error(error.message),
  })

  function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createAnnouncement.isPending) return
    const form = event.currentTarget
    const data = new FormData(form)
    createAnnouncement.mutate({ title: String(data.get('title') || ''), content: String(data.get('content') || '') }, { onSuccess: () => form.reset() })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Duyurular</h1>
        <p className="mt-1 text-sm text-text-secondary">{department} bölümündeki güncel duyuruları okuyun ve yorumlayın.</p>
      </header>

      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Yeni duyuru</CardTitle><CardDescription>Bu duyuru yalnızca seçili bölümde yayınlanır.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitAnnouncement} noValidate>
              <div className="space-y-2"><Label htmlFor="announcement-title">Başlık *</Label><Input ref={titleRef} id="announcement-title" name="title" maxLength={160} required /></div>
              <div className="space-y-2"><Label htmlFor="announcement-content">İçerik *</Label><Textarea id="announcement-content" name="content" rows={5} maxLength={10_000} required /></div>
              <div className="flex justify-end"><Button type="submit" className="min-h-11 gap-2" disabled={createAnnouncement.isPending}>{createAnnouncement.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Yayınla</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {announcements.isLoading ? (
        <div className="space-y-4" aria-label="Duyurular yükleniyor"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : announcements.isError ? (
        <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Duyurular yüklenemedi</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{announcements.error.message}</span><Button variant="outline" className="w-fit gap-2" onClick={() => announcements.refetch()}><RefreshCw className="size-4" />Yeniden dene</Button></AlertDescription></Alert>
      ) : announcements.data?.length ? (
        <div className="space-y-4">
          {announcements.data.map((announcement) => {
            const commentPending = addComment.isPending && addComment.variables?.announcementId === announcement.id
            return (
              <article key={announcement.id} className="rounded-xl border border-border bg-surface">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-text-primary">{announcement.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary"><span>{announcement.author.name}</span><Badge variant="secondary">{roleName(announcement.author.role)}</Badge><span aria-hidden="true">·</span><time dateTime={announcement.createdAt}>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true, locale: tr })}</time></div>
                    </div>
                    {canManage && <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-destructive" aria-label={`${announcement.title} duyurusunu sil`} onClick={() => setDeleteTarget(announcement)}><Trash2 className="size-4" /></Button>}
                  </div>
                  <p className="mt-4 max-w-[75ch] whitespace-pre-wrap text-sm leading-6 text-text-primary">{announcement.content}</p>
                </div>
                <div className="border-t border-border bg-surface-muted/50 p-4 sm:px-6">
                  <div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="size-4" aria-hidden="true" />{announcement.comments.length} yorum</div>
                  {announcement.comments.length > 0 && <div className="mt-3 space-y-3">{announcement.comments.map((comment) => <div key={comment.id} className="rounded-lg bg-surface p-3"><div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary"><span className="font-medium text-text-primary">{comment.author.name}</span><span>{roleName(comment.author.role)}</span><span aria-hidden="true">·</span><time dateTime={comment.createdAt}>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: tr })}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.content}</p></div>)}</div>}
                  <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); const value = comments[announcement.id]?.trim(); if (value && !commentPending) addComment.mutate({ announcementId: announcement.id, content: value }) }}>
                    <Label className="sr-only" htmlFor={`comment-${announcement.id}`}>Yorumunuz</Label>
                    <Input id={`comment-${announcement.id}`} value={comments[announcement.id] || ''} onChange={(event) => setComments((current) => ({ ...current, [announcement.id]: event.target.value }))} placeholder="Yorum yazın" maxLength={2000} />
                    <Button type="submit" variant="outline" className="min-h-11 gap-2" disabled={commentPending || !(comments[announcement.id] || '').trim()}>{commentPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Yorum ekle</Button>
                  </form>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><MessageSquare className="mx-auto size-8 text-text-secondary" /><h2 className="mt-3 font-semibold">Henüz duyuru yok</h2><p className="mt-1 text-sm text-text-secondary">Yeni duyurular burada görünecek.</p></div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Duyuruyu sil?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}” duyurusu ve tüm yorumları kalıcı olarak silinecek.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteAnnouncement.isPending} onClick={() => deleteTarget && deleteAnnouncement.mutate(deleteTarget.id)}>{deleteAnnouncement.isPending && <LoaderCircle className="size-4 animate-spin" />}Duyuruyu sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
