'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, LoaderCircle, LogIn, RotateCcw, Ship } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const departments = {
  GMIM: { short: 'GMİM', full: 'Gemi Makineleri İşletme Mühendisliği' },
  DUIM: { short: 'DUİM', full: 'Deniz Ulaştırma İşletme Mühendisliği' },
} as const
type Department = keyof typeof departments

export default function PortalClient() {
  const router = useRouter()
  const [department, setDepartment] = useState<Department | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('gmim_selected_dept')
    return stored === 'GMIM' || stored === 'DUIM' ? stored : null
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function chooseDepartment(value: Department) { setDepartment(value); localStorage.setItem('gmim_selected_dept', value) }
  async function login() {
    if (!email || !password || !department || submitting) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, department }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Giriş yapılamadı')
      router.push(data.user.role === 'user' ? '/tasks' : '/dashboard')
      router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Giriş yapılamadı') }
    finally { setSubmitting(false) }
  }

  if (!department) return <main className="flex min-h-dvh items-center justify-center bg-background p-4"><div className="w-full max-w-2xl"><div className="mb-10 text-center"><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-xl bg-brand-navy"><Ship className="size-8 text-white" /></div><h1 className="text-2xl font-bold text-text-primary">İTÜ Denizcilik Fakültesi</h1><p className="mt-1 text-sm text-text-secondary">Ar.Gör Yönetim Sistemi · Bölüm seçin</p></div><div className="grid gap-4 sm:grid-cols-2">{(Object.keys(departments) as Department[]).map((code) => <button key={code} data-department={code} onClick={() => chooseDepartment(code)} className="group min-h-44 rounded-xl border border-department/35 bg-surface p-6 text-left transition-colors hover:border-department focus-visible:outline-ring"><div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-department"><Ship className="size-6 text-white" /></div><h2 className="text-xl font-bold">{departments[code].short}</h2><p className="mt-1 text-sm text-text-secondary">{departments[code].full}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-department">Giriş yap <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span></button>)}</div><p className="mt-8 text-center text-xs text-text-secondary">İTÜ DF Ar.Gör Yönetim Sistemi</p></div></main>

  return <main data-department={department} className="flex min-h-dvh items-center justify-center bg-background p-4"><div className="w-full max-w-md"><div className="mb-8 text-center"><div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-xl bg-department"><Ship className="size-8 text-white" /></div><h1 className="text-2xl font-bold">{departments[department].short} Ar.Gör Yönetim</h1><p className="mt-1 text-sm text-text-secondary">İTÜ Denizcilik Fakültesi · {departments[department].full}</p></div><Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><LogIn className="size-5 text-department" />Sisteme giriş</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); login() }}><div className="space-y-2"><Label htmlFor="login-email">E-posta</Label><Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="login-password">Şifre</Label><Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div><Button type="submit" className="min-h-11 w-full gap-2 bg-department text-department-foreground hover:bg-department/90" disabled={submitting || !email || !password}>{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}Giriş yap</Button><Button type="button" variant="ghost" className="min-h-11 w-full gap-2 text-text-secondary" onClick={() => { setDepartment(null); localStorage.removeItem('gmim_selected_dept') }}><RotateCcw className="size-4" />Bölüm değiştir</Button></form></CardContent></Card></div></main>
}
