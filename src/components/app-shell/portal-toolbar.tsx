'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Bell, BellRing, Check, LogOut, Moon, Settings2, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { portalHref, usePortalContext } from '@/components/app-shell/portal-context'
import { notificationHref } from '@/components/app-shell/notification-link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  relatedId: string | null
  createdAt: string
}

type NotificationResponse = { notifications: NotificationItem[]; unreadCount: number }

async function getNotifications(userId: string): Promise<NotificationResponse> {
  const response = await fetch(`/api/notifications?assistantId=${encodeURIComponent(userId)}`)
  if (!response.ok) throw new Error('Bildirimler alınamadı')
  return response.json()
}

export function PortalToolbar() {
  const { user, department, setDepartment } = usePortalContext()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('gmim_theme') === 'dark' ? 'dark' : 'light'
  })
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const notifications = useQuery({
    queryKey: ['notifications', user.id],
    queryFn: () => getNotifications(user.id),
  })

  const markRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationId ? { notificationId } : { markAllRead: true, assistantId: user.id }),
      })
      if (!response.ok) throw new Error('Bildirim güncellenemedi')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user.id] }),
    onError: () => toast.error('Bildirim güncellenemedi'),
  })

  const changePassword = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Şifre değiştirilemedi')
    },
    onSuccess: () => {
      toast.success('Şifre değiştirildi')
      setCurrentPassword('')
      setNewPassword('')
      setPasswordOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('gmim_theme', theme)
  }, [theme])

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    localStorage.removeItem('gmim_current_user')
    router.replace('/')
    router.refresh()
  }

  const unreadCount = notifications.data?.unreadCount || 0

  function openNotification(item: NotificationItem) {
    const href = notificationHref(item, user.role)
    if (!href) return
    if (!item.isRead) markRead.mutate(item.id)
    setNotificationsOpen(false)
    router.push(portalHref(href, user, department))
  }

  return (
    <>
      {user.role === 'dekan' && (
        <Select value={department} onValueChange={(value) => setDepartment(value as 'GMIM' | 'DUIM')}>
          <SelectTrigger aria-label="Görüntülenen bölüm" className="h-11 w-[96px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GMIM">GMİM</SelectItem>
            <SelectItem value="DUIM">DUİM</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
      </Button>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="relative size-11" aria-label="Bildirimler">
            {unreadCount > 0 ? <BellRing aria-hidden="true" className="size-4 text-warning" /> : <Bell aria-hidden="true" className="size-4" />}
            {unreadCount > 0 && (
              <Badge className="absolute right-0 top-0 min-w-5 justify-center border-0 bg-destructive px-1 text-[10px] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bildirimler</DialogTitle>
            <DialogDescription>Görev ve yönetim işlemlerinizdeki son gelişmeler.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55dvh] pr-3">
            {notifications.isLoading && <p className="py-8 text-center text-sm text-text-secondary">Bildirimler yükleniyor…</p>}
            {notifications.isError && <p className="py-8 text-center text-sm text-destructive">Bildirimler alınamadı.</p>}
            {notifications.data?.notifications.length === 0 && <p className="py-8 text-center text-sm text-text-secondary">Yeni bildiriminiz yok.</p>}
            <div className="space-y-2">
              {notifications.data?.notifications.map((item) => {
                const href = notificationHref(item, user.role)
                return (
                <article key={item.id} className={`rounded-lg border ${item.isRead ? 'bg-surface' : 'bg-info-muted'}`}>
                  {href ? <button type="button" className="flex min-h-11 w-full items-start justify-between gap-3 rounded-lg p-3 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openNotification(item)}>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.message}</p>
                      <time className="mt-2 block text-xs text-text-secondary">{new Date(item.createdAt).toLocaleString('tr-TR')}</time>
                    </div>
                    <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-medium text-primary">Aç<ArrowRight aria-hidden="true" className="size-3.5" /></span>
                  </button> : <div className="p-3"><h3 className="text-sm font-semibold text-text-primary">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.message}</p><div className="mt-2 flex items-center justify-between gap-3"><time className="text-xs text-text-secondary">{new Date(item.createdAt).toLocaleString('tr-TR')}</time>{!item.isRead ? <Button type="button" variant="ghost" size="sm" onClick={() => markRead.mutate(item.id)}>Okundu</Button> : null}</div></div>}
                </article>
              )})}
            </div>
          </ScrollArea>
          {unreadCount > 0 && (
            <Button type="button" variant="outline" onClick={() => markRead.mutate(undefined)} disabled={markRead.isPending}>
              Tümünü okundu işaretle
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Şifre değiştir">
            <Settings2 aria-hidden="true" className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Şifre değiştir</DialogTitle>
            <DialogDescription>Mevcut şifrenizi doğrulayarak yeni şifrenizi belirleyin.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); changePassword.mutate() }}>
            <div className="space-y-2">
              <Label htmlFor="portal-current-password">Mevcut şifre</Label>
              <Input id="portal-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-new-password">Yeni şifre</Label>
              <Input id="portal-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={changePassword.isPending || !currentPassword || newPassword.length < 4}>
              <Check aria-hidden="true" className="size-4" />
              {changePassword.isPending ? 'Değiştiriliyor…' : 'Şifreyi değiştir'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Çıkış yap" onClick={logout}>
        <LogOut aria-hidden="true" className="size-4" />
      </Button>
    </>
  )
}
