'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Users, ListChecks, GraduationCap, Brain, BarChart3, Plus, CheckCircle2,
  Clock, AlertCircle, UserCheck, Award, TrendingDown, Zap, Ship,
  CalendarDays, ChevronRight, Sparkles, Send, ArrowUpRight, Target,
  Bell, BellRing, Upload, FileSpreadsheet, LogIn, LogOut, Shield,
  Info, Trash2, XCircle, Check, RotateCcw, Settings2
} from 'lucide-react'

interface ResearchAssistant {
  id: string; name: string; email: string; phone: string | null
  faculty: string; department: string; totalPoints: number; order: number
  isActive: boolean; role: string; tasks: Task[]; permanentDuties: PermanentDuty[]; pendingDutyChanges: PendingDutyChange[]
}
interface Task {
  id: string; number: number; description: string; hoursWorked: string | null
  date: string; points: number; status: string; source: string; notes: string | null
  assistantId: string; categoryId: string | null; assistant?: ResearchAssistant; category?: PointCategory
}
interface PointCategory { id: string; name: string; points: number; description: string | null; isActive: boolean }
interface PendingDutyChange { id: string; changeType: string; dutyName: string; description: string | null; status: string; assistantId: string; dutyId: string | null; submittedBy: string | null; createdAt: string }
interface Exam {
  id: string; courseCode: string; courseName: string; instructor: string; date: string
  day: string; timeSlot: string; classroom: string | null; requiredSupervisors: number
  notes: string | null; supervisors: ExamSupervisor[]
}
interface ExamSupervisor { id: string; examId: string; assistantId: string; assistant: ResearchAssistant }
interface NotificationItem {
  id: string; title: string; message: string; type: string; isRead: boolean
  relatedId: string | null; createdAt: string; assistantId: string
}
interface WeeklyScheduleItem {
  id: string; dayOfWeek: number; timeSlot: string; description: string
  assistantId: string; assistant: ResearchAssistant
}
interface AIClassifyResult {
  matched: boolean; category: PointCategory | null; confidence: number
  suggestedPoints: number; reasoning?: string; message?: string
  allCategories: { id: string; name: string; points: number }[]
}

const DAY_NAMES: Record<number, string> = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi', 7: 'Pazar' }

export default function Home() {
  const [assistants, setAssistants] = useState<ResearchAssistant[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<PointCategory[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Auth
  const [currentUser, setCurrentUser] = useState<ResearchAssistant | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  // Task form
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskHours, setTaskHours] = useState('')
  const [taskAssistantId, setTaskAssistantId] = useState('')
  const [taskCategoryId, setTaskCategoryId] = useState('')
  const [taskPoints, setTaskPoints] = useState(0)
  const [taskNotes, setTaskNotes] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyResult, setClassifyResult] = useState<AIClassifyResult | null>(null)

  // Exam form
  const [examCourseCode, setExamCourseCode] = useState('')
  const [examCourseName, setExamCourseName] = useState('')
  const [examInstructor, setExamInstructor] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examDay, setExamDay] = useState('')
  const [examTime, setExamTime] = useState('')
  const [examSupervisors, setExamSupervisors] = useState('1')
  const [examNotes, setExamNotes] = useState('')

  // Schedule form
  const [schedAssistantId, setSchedAssistantId] = useState('')
  const [schedDay, setSchedDay] = useState('1')
  const [schedTime, setSchedTime] = useState('')
  const [schedDesc, setSchedDesc] = useState('')

  // Import
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState('tasks')
  const [isImporting, setIsImporting] = useState(false)

  // Task filter for admin
  const [taskFilterAssistant, setTaskFilterAssistant] = useState<string>('all')

  // Permanent duty editing
  const [editingDutyAssistantId, setEditingDutyAssistantId] = useState<string | null>(null)
  const [newDutyName, setNewDutyName] = useState('')

  // Dialogs
  const [showNotifDialog, setShowNotifDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonEmail, setNewPersonEmail] = useState('')
  const [newPersonPhone, setNewPersonPhone] = useState('')
  const [newPersonPassword, setNewPersonPassword] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [assRes, taskRes, catRes, examRes, notifRes, schedRes, pendRes] = await Promise.all([
        fetch('/api/assistants'), fetch('/api/tasks'), fetch('/api/categories'),
        fetch('/api/exams'), fetch('/api/notifications'), fetch('/api/weekly-schedule'),
        fetch('/api/approve-task'),
      ])
      setAssistants(await assRes.json())
      setTasks(await taskRes.json())
      setCategories(await catRes.json())
      setExams(await examRes.json())
      const notifData = await notifRes.json()
      setNotifications(notifData.notifications || [])
      setUnreadCount(notifData.unreadCount || 0)
      setWeeklySchedules(await schedRes.json())
      setPendingTasks(await pendRes.json())
    } catch (err) { console.error(err); toast.error('Veriler yüklenirken hata') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const isAdmin = currentUser?.role === 'admin'

  // Auth
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { toast.error('E-posta ve şifre gerekli'); return }
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentUser(data.user); setShowLoginDialog(false); setLoginEmail(''); setLoginPassword('')
        toast.success(`Hoş geldiniz, ${data.user.name}!`, { description: data.user.role === 'admin' ? 'Temsilci (Admin)' : 'Araş Gör' })
        fetchData()
      } else { toast.error(data.error || 'Giriş başarısız') }
    } catch { toast.error('Bağlantı hatası') }
  }

  // AI Classify
  const handleClassifyTask = async () => {
    if (!taskDesc.trim()) return
    setIsClassifying(true)
    try {
      const res = await fetch('/api/ai-classify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription: taskDesc }),
      })
      const data: AIClassifyResult = await res.json()
      setClassifyResult(data)
      if (data.matched) {
        setTaskCategoryId(data.category?.id || ''); setTaskPoints(data.suggestedPoints)
        toast.success(`AI: ${data.category?.name} (${data.suggestedPoints} puan)`, { description: data.reasoning })
      } else { toast.info('Eşleşme bulunamadı, manuel seçin') }
    } catch { toast.error('AI sınıflandırma hatası') }
    finally { setIsClassifying(false) }
  }

  // Submit task - ar.gör self-reports → pending; admin assigns → approved
  const handleSubmitTask = async () => {
    if (!taskDesc || !taskDate || !taskAssistantId) { toast.error('Zorunlu alanları doldurun'); return }
    const source = isAdmin ? 'temsilci_assigned' : 'external'
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: taskDesc, date: taskDate, hoursWorked: taskHours || null,
          assistantId: taskAssistantId, categoryId: taskCategoryId || null,
          points: taskPoints, source, notes: taskNotes || null,
          assignedBy: currentUser?.id || null,
        }),
      })
      if (res.ok) {
        toast.success(isAdmin ? 'Görev atandı!' : 'Görev temsilci onayına gönderildi!', {
          description: isAdmin ? 'Puan otomatik eklendi' : 'Onaylandıktan sonra puan eklenecek'
        })
        setTaskDesc(''); setTaskDate(''); setTaskHours(''); setTaskAssistantId('')
        setTaskCategoryId(''); setTaskPoints(0); setTaskNotes(''); setClassifyResult(null)
        fetchData()
      } else { toast.error('Hata') }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Approve/Reject task
  const handleApproveTask = async (taskId: string, action: 'approve' | 'reject') => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/approve-task', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action, reviewerId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(action === 'approve' ? 'Görev onaylandı!' : 'Görev reddedildi')
        fetchData()
      } else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Submit exam
  const handleSubmitExam = async () => {
    if (!examCourseCode || !examCourseName || !examDate || !examDay || !examTime) { toast.error('Zorunlu alanları doldurun'); return }
    try {
      const res = await fetch('/api/exams', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: examCourseCode, courseName: examCourseName, instructor: examInstructor,
          date: examDate, day: examDay, timeSlot: examTime,
          requiredSupervisors: parseInt(examSupervisors), notes: examNotes || null,
        }),
      })
      if (res.ok) {
        toast.success('Sınav eklendi!')
        setExamCourseCode(''); setExamCourseName(''); setExamInstructor(''); setExamDate('')
        setExamDay(''); setExamTime(''); setExamSupervisors('1'); setExamNotes('')
        fetchData()
      }
    } catch { toast.error('Bağlantı hatası') }
  }

  const handleAutoAssign = async (examId: string) => {
    try {
      const res = await fetch('/api/supervisor-assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchData() }
      else { toast.error(data.message || 'Hata') }
    } catch { toast.error('Bağlantı hatası') }
  }

  const handleAddSchedule = async () => {
    if (!schedAssistantId || !schedTime || !schedDesc) { toast.error('Tüm alanları doldurun'); return }
    try {
      const res = await fetch('/api/weekly-schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: schedAssistantId, dayOfWeek: parseInt(schedDay), timeSlot: schedTime, description: schedDesc }),
      })
      if (res.ok) { toast.success('Program eklendi!'); setSchedAssistantId(''); setSchedTime(''); setSchedDesc(''); fetchData() }
      else {
        const errData = await res.json()
        if (res.status === 409) toast.error('Zaman çakışması!', { description: errData.conflicts?.map((c: WeeklyScheduleItem) => `${c.description} (${c.timeSlot})`).join(', ') })
      }
    } catch { toast.error('Bağlantı hatası') }
  }

  const handleDeleteSchedule = async (id: string) => {
    try { const res = await fetch(`/api/weekly-schedule?id=${id}`, { method: 'DELETE' }); if (res.ok) { toast.success('Silindi'); fetchData() } } catch { /* */ }
  }

  const handleImport = async () => {
    if (!importFile) { toast.error('Dosya seçin'); return }
    setIsImporting(true)
    try {
      const formData = new FormData(); formData.append('file', importFile); formData.append('type', importType)
      const res = await fetch('/api/import-excel', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setImportFile(null); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
    finally { setIsImporting(false) }
  }

  const handleMarkRead = async (notifId?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifId ? { notificationId: notifId } : { markAllRead: true, assistantId: currentUser?.id }),
      })
      fetchData()
    } catch { /* */ }
  }

  // Period reset
  const handleResetPeriod = async (action: 'reset' | 'archive') => {
    if (!currentUser || !isAdmin) return
    try {
      const carryOverPoints = action === 'archive'
        ? Object.fromEntries(assistants.map(a => [a.id, a.totalPoints]))
        : undefined
      const res = await fetch('/api/reset-period', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, carryOverPoints }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setShowResetDialog(false); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Delete task (admin only)
  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser || !isAdmin) return
    try {
      const res = await fetch(`/api/delete-task?id=${taskId}&requesterId=${currentUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Permanent duty change (admin: direct, user: pending approval)
  const handleDutyChange = async (assistantId: string, changeType: 'add' | 'edit' | 'delete', dutyName: string, dutyId?: string, description?: string) => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/pending-duty', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId, changeType, dutyName, description: description || null,
          dutyId: dutyId || null, submittedBy: currentUser.id,
          isDirectAdmin: isAdmin,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(isAdmin ? 'Daimi görev güncellendi' : 'Değişiklik talebi gönderildi, onay bekleniyor')
        setEditingDutyAssistantId(null); setNewDutyName('')
        fetchData()
      } else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Approve/reject pending duty change
  const handleDutyApproval = async (changeId: string, action: 'approve' | 'reject') => {
    if (!currentUser || !isAdmin) return
    try {
      const res = await fetch('/api/pending-duty', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, action, reviewerId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Change own password
  const handleChangePassword = async () => {
    if (!currentUser || !currentPassword || !newPassword) { toast.error('Tüm alanları doldurun'); return }
    if (newPassword.length < 4) { toast.error('Yeni şifre en az 4 karakter olmalı'); return }
    try {
      const res = await fetch('/api/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: currentUser.id, currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setShowPasswordDialog(false); setCurrentPassword(''); setNewPassword('') }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Admin reset password
  const handleResetPassword = async (assistantId: string, assistantName: string) => {
    if (!currentUser || !isAdmin) return
    const newPass = prompt(`${assistantName} için yeni şifre girin (en az 4 karakter):`)
    if (!newPass || newPass.length < 4) { toast.error('Şifre en az 4 karakter olmalı'); return }
    try {
      const res = await fetch('/api/reset-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, newPassword: newPass, requesterId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message) }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Add new assistant
  const handleAddAssistant = async () => {
    if (!currentUser || !isAdmin) return
    if (!newPersonName || !newPersonEmail) { toast.error('Ad ve e-posta gerekli'); return }
    try {
      const res = await fetch('/api/add-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersonName, email: newPersonEmail, phone: newPersonPhone || null,
          password: newPersonPassword || undefined, requesterId: currentUser.id,
        }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setShowAddPersonDialog(false); setNewPersonName(''); setNewPersonEmail(''); setNewPersonPhone(''); setNewPersonPassword(''); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Remove assistant
  const handleRemoveAssistant = async (assistantId: string, assistantName: string) => {
    if (!currentUser || !isAdmin) return
    if (!confirm(`${assistantName} adlı kişiyi sistemden kaldırmak istediğinize emin misiniz? Tüm görev ve kayıtları silinecek.`)) return
    try {
      const res = await fetch(`/api/remove-assistant?id=${assistantId}&requesterId=${currentUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Export Excel
  const handleExportExcel = async (type: string) => {
    try {
      const res = await fetch(`/api/export-excel?type=${type}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `gmim_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Excel dosyası indirildi')
    } catch { toast.error('İndirme hatası') }
  }

  // Computed
  const totalTasks = tasks.length
  const pendingCount = pendingTasks.length
  const activeAssistants = assistants.filter(a => a.isActive)
  const maxPoints = Math.max(...activeAssistants.map(a => a.totalPoints), 1)
  const minPA = activeAssistants.length > 0 ? [...activeAssistants].sort((a, b) => a.totalPoints - b.totalPoints)[0] : null
  const unassignedExams = exams.filter(e => e.supervisors.length < e.requiredSupervisors).length
  const sortedByPoints = [...assistants].sort((a, b) => a.totalPoints - b.totalPoints)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-600 font-medium">GMIM Sistemi Yükleniyor...</p>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Ship className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">GMIM Ar.Gör Yönetim</h1>
              <p className="text-xs text-slate-500">İTÜ Denizcilik Fakültesi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && isAdmin && (
              <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs animate-pulse">
                <Clock className="h-3 w-3" /> {pendingCount} Onay Bekliyor
              </Badge>
            )}
            <Dialog open={showNotifDialog} onOpenChange={setShowNotifDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  {unreadCount > 0 ? <BellRing className="h-4 w-4 text-amber-500" /> : <Bell className="h-4 w-4 text-slate-500" />}
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Bildirimler</DialogTitle></DialogHeader>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">Bildirim yok</p> : (
                    <div className="space-y-2">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 rounded-lg border ${n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                            </div>
                            {!n.isRead && <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleMarkRead(n.id)}>Okundu</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {unreadCount > 0 && <Button variant="outline" size="sm" className="w-full" onClick={() => handleMarkRead()}>Tümünü Okundu İşaretle</Button>}
              </DialogContent>
            </Dialog>
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Badge className={`gap-1 text-xs ${isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                  <Shield className="h-3 w-3" />{isAdmin ? 'Temsilci' : 'Ar.Gör'}
                </Badge>
                <span className="text-xs text-slate-600 hidden sm:inline">{currentUser.name}</span>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Şifre Değiştir"><Settings2 className="h-3.5 w-3.5" /></Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Şifre Değiştir</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Mevcut Şifre</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Yeni Şifre</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="En az 4 karakter" /></div>
                      <Button onClick={handleChangePassword} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><Check className="h-4 w-4" /> Değiştir</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentUser(null); toast.info('Çıkış yapıldı') }}><LogOut className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1 text-xs"><LogIn className="h-3.5 w-3.5" /> Giriş</Button></DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" /> Sisteme Giriş</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>E-posta</Label><Input placeholder="ymutlu@itu.edu.tr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Şifre</Label><Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
                    <Button onClick={handleLogin} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><LogIn className="h-4 w-4" /> Giriş Yap</Button>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p className="font-semibold text-slate-500 mb-1">Giriş Bilgileri:</p>
                      <p>ymutlu@itu.edu.tr / tarik2026 (Temsilci)</p>
                      <p>cenkkaya@itu.edu.tr / cenk2026</p>
                      <p>sbicen@itu.edu.tr / samet2026</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full grid-cols-none gap-1 bg-slate-100 p-1 rounded-xl h-auto">
              {[
                { v: 'dashboard', icon: BarChart3, label: 'Puan Tablosu', short: 'Puan' },
                { v: 'approvals', icon: CheckCircle2, label: 'Onaylar', short: 'Onay', badge: pendingCount },
                { v: 'tasks', icon: ListChecks, label: 'Görevler', short: 'Görev' },
                { v: 'exams', icon: GraduationCap, label: 'Sınavlar', short: 'Sınav' },
                { v: 'schedule', icon: CalendarDays, label: 'Program', short: 'Prog.' },
                { v: 'import', icon: Upload, label: 'Veri Aktar', short: 'Aktar' },
                { v: 'categories', icon: Award, label: 'Puan Baremi', short: 'Barem' },
                { v: 'personnel', icon: Users, label: 'Personel', short: 'Kişiler' },
              ].map(tab => (
                <TabsTrigger key={tab.v} value={tab.v} className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-3 whitespace-nowrap relative">
                  <tab.icon className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.short}</span>
                  {tab.badge && tab.badge > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] text-white flex items-center justify-center font-bold">{tab.badge}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Aktif Ar.Gör', val: activeAssistants.length, icon: Users, from: 'from-emerald-50', to: 'to-emerald-100/50', ibg: 'bg-emerald-500/20', ic: 'text-emerald-700', vc: 'text-emerald-900' },
                { label: 'Onay Bekleyen', val: pendingCount, icon: Clock, from: 'from-amber-50', to: 'to-amber-100/50', ibg: 'bg-amber-500/20', ic: 'text-amber-700', vc: 'text-amber-900' },
                { label: 'Toplam Görev', val: totalTasks, icon: ListChecks, from: 'from-blue-50', to: 'to-blue-100/50', ibg: 'bg-blue-500/20', ic: 'text-blue-700', vc: 'text-blue-900' },
                { label: 'Gözetmen Bekleyen', val: unassignedExams, icon: AlertCircle, from: 'from-rose-50', to: 'to-rose-100/50', ibg: 'bg-rose-500/20', ic: 'text-rose-700', vc: 'text-rose-900' },
              ].map(s => (
                <Card key={s.label} className={`border-0 shadow-md bg-gradient-to-br ${s.from} ${s.to}`}>
                  <CardContent className="p-4"><div className="flex items-center justify-between"><div><p className={`text-xs ${s.ic} font-medium`}>{s.label}</p><p className={`text-2xl font-bold ${s.vc}`}>{s.val}</p></div><div className={`h-10 w-10 rounded-xl ${s.ibg} flex items-center justify-center`}><s.icon className={`h-5 w-5 ${s.ic}`} /></div></div></CardContent>
                </Card>
              ))}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 flex-wrap">
                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
                      <RotateCcw className="h-3.5 w-3.5" /> Dönem Yönetimi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Dönem Yönetimi</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <h4 className="font-semibold text-sm text-slate-900 mb-1">Mevcut Puan Durumu</h4>
                        <p className="text-xs text-slate-500 mb-3">Yeni döneme geçerken puanları sıfırlayabilir veya taşıyabilirsiniz.</p>
                        <div className="space-y-1">
                          {sortedByPoints.slice(0, 5).map(ra => (
                            <div key={ra.id} className="flex justify-between text-xs"><span>{ra.name}</span><span className="font-mono font-bold">{ra.totalPoints} p</span></div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-emerald-300 hover:bg-emerald-50" onClick={() => handleResetPeriod('archive')}>
                          <span className="text-xs font-semibold text-emerald-800">Puanları Taşı</span>
                          <span className="text-[10px] text-emerald-600">Mevcut puanlar yeni döneme aktarılır</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-orange-300 hover:bg-orange-50" onClick={() => handleResetPeriod('reset')}>
                          <span className="text-xs font-semibold text-orange-800">Sıfırla</span>
                          <span className="text-[10px] text-orange-600">Herkesin puanı 0 olur</span>
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="gap-1 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleExportExcel('ranking')}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Puanları İndir
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleExportExcel('tasks')}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Görevleri İndir
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs border-violet-300 text-violet-700 hover:bg-violet-50" onClick={() => handleExportExcel('exams')}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Sınavları İndir
                </Button>
              </div>
            )}

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-emerald-600" /> Puan Sıralaması</CardTitle><CardDescription>En az puanlı araş gör görev önceliğine sahiptir</CardDescription></div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1"><Target className="h-3 w-3" /> Öncelik: Düşük Puan</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedByPoints.filter(ra => ra.isActive).map((ra, idx) => (
                    <div key={ra.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-slate-50 ${idx === 0 ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-emerald-500 text-white' : idx === 1 ? 'bg-amber-500 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">{ra.name}</span>
                          {idx === 0 && <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5"><Zap className="h-2.5 w-2.5" /> ÖNCELİKLİ</Badge>}
                          {ra.role === 'admin' && <Badge className="bg-slate-700 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5"><Shield className="h-2.5 w-2.5" /> TEMSİLCİ</Badge>}
                        </div>
                        <Progress value={(ra.totalPoints / maxPoints) * 100} className="h-2 mt-1.5" />
                      </div>
                      <div className="text-right flex-shrink-0"><span className="text-lg font-bold text-slate-900">{ra.totalPoints}</span><span className="text-xs text-slate-500 ml-1">puan</span></div>
                    </div>
                  ))}
                  {sortedByPoints.filter(ra => !ra.isActive).length > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-xs text-red-500 font-medium mb-2">🔴 Yurt dışında / Pasif</p>
                      {sortedByPoints.filter(ra => !ra.isActive).map((ra) => (
                        <div key={ra.id} className="flex items-center gap-4 p-2 rounded-xl opacity-50">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-200 text-red-600 flex items-center justify-center text-sm font-bold">−</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500 truncate line-through">{ra.name}</span>
                              <Badge className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0 h-5">Pasif</Badge>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0"><span className="text-lg font-bold text-slate-400">{ra.totalPoints}</span><span className="text-xs text-slate-400 ml-1">puan</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {minPA && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><ArrowUpRight className="h-4 w-4 text-white" /></div>
                    <div><p className="text-sm font-semibold text-emerald-800">{minPA.name} en az puana sahip</p><p className="text-xs text-emerald-600">Yeni görevler öncelikli olarak bu araş görle paylaşılmalıdır</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPROVALS */}
          <TabsContent value="approvals" className="space-y-6">
            {!isAdmin ? (
              <Card className="border-0 shadow-md"><CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700">Sadece Temsilci</h3>
                <p className="text-sm text-slate-500">Bu bölüm sadece araş gör temsilcisi tarafından görüntülenebilir.</p>
              </CardContent></Card>
            ) : pendingTasks.length === 0 ? (
              <Card className="border-0 shadow-md"><CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                <h3 className="font-semibold text-emerald-700">Tüm görevler onaylandı!</h3>
                <p className="text-sm text-slate-500">Onay bekleyen görev bulunmuyor.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-400">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                    <div><p className="font-semibold text-amber-800">{pendingTasks.length} görev onay bekliyor</p><p className="text-xs text-amber-600">Araş görler tarafından gönderilen görevler aşağıda listeleniyor</p></div>
                  </CardContent>
                </Card>
                {pendingTasks.map(task => (
                  <Card key={task.id} className="border-0 shadow-md border-l-4 border-l-amber-400">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{task.assistant?.name}</Badge>
                            <span className="text-xs text-slate-400">{new Date(task.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <p className="font-medium text-slate-900">{task.description}</p>
                          {task.hoursWorked && <p className="text-xs text-slate-500">Saat: {task.hoursWorked}</p>}
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 text-xs">{task.points} puan</Badge>
                            {task.category && <Badge variant="outline" className="text-xs">{task.category.name}</Badge>}
                          </div>
                          {task.notes && <p className="text-xs text-slate-400 italic">Not: {task.notes}</p>}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => handleApproveTask(task.id, 'approve')}>
                            <Check className="h-3.5 w-3.5" /> Onayla
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 gap-1" onClick={() => handleApproveTask(task.id, 'reject')}>
                            <XCircle className="h-3.5 w-3.5" /> Reddet
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" /> {isAdmin ? 'Görev Ata' : 'Görev Bildir'}</CardTitle>
                  <CardDescription>{isAdmin ? 'Araş görle görev atayın' : 'Yaptığınız işi bildirin, temsilci onaylasın'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Görev Açıklaması</Label>
                    <div className="flex gap-2">
                      <Textarea placeholder={isAdmin ? "Örn: MÜDEK toplantısı" : "Örn: Dün MÜDEK toplantısına 3 saat katıldım"} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="resize-none" rows={2} />
                      <Button size="icon" variant="outline" className="flex-shrink-0 h-auto border-emerald-300 hover:bg-emerald-50" onClick={handleClassifyTask} disabled={isClassifying || !taskDesc.trim()}>
                        {isClassifying ? <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><Brain className="h-3 w-3" /> AI otomatik kategori eşleştirme</p>
                  </div>
                  {classifyResult && (
                    <div className={`p-3 rounded-xl text-sm ${classifyResult.matched ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                      {classifyResult.matched ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-emerald-800 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI: {classifyResult.category?.name}</p>
                          <p className="text-xs text-emerald-600">Puan: {classifyResult.suggestedPoints} | Güven: %{Math.round(classifyResult.confidence * 100)}</p>
                          {classifyResult.reasoning && <p className="text-[11px] text-emerald-500 italic">{classifyResult.reasoning}</p>}
                        </div>
                      ) : <p className="text-amber-800 text-xs">{classifyResult.message}</p>}
                    </div>
                  )}
                  {!isAdmin && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-800 flex items-center gap-1"><Info className="h-3.5 w-3.5 flex-shrink-0" /> Göreviniz temsilci onayına gönderilecek. Onaylandıktan sonra puanınız eklenecektir.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Araş Gör</Label>
                    <Select value={taskAssistantId} onValueChange={setTaskAssistantId}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {!isAdmin ? (
                          currentUser ? <SelectItem value={currentUser.id}>{currentUser.name} (Kendim)</SelectItem> : null
                        ) : (
                          sortedByPoints.map(ra => <SelectItem key={ra.id} value={ra.id}>{ra.name} ({ra.totalPoints}p)</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Kategori</Label>
                    <Select value={taskCategoryId} onValueChange={v => { setTaskCategoryId(v); const cat = categories.find(c => c.id === v); if (cat) setTaskPoints(cat.points) }}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.points}p)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="text-sm font-medium">Tarih</Label><Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} /></div>
                    <div className="space-y-2"><Label className="text-sm font-medium">Saat</Label><Input placeholder="09:00-12:00" value={taskHours} onChange={e => setTaskHours(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Puan</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" value={taskPoints} onChange={e => setTaskPoints(parseInt(e.target.value) || 0)} className="w-24" />
                      {classifyResult?.matched && <Badge className="bg-emerald-100 text-emerald-700 gap-1 text-xs"><Sparkles className="h-3 w-3" /> AI Önerisi</Badge>}
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-sm font-medium">Notlar</Label><Input placeholder="Opsiyonel" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} /></div>
                  <Button onClick={handleSubmitTask} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Send className="h-4 w-4" /> {isAdmin ? 'Görevi Ata' : 'Görevi Gönder (Onaya)'}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-slate-700" />
                        {isAdmin ? 'Tüm Görevler' : 'İş Geçmişim'}
                      </CardTitle>
                      <CardDescription>
                        {isAdmin
                          ? taskFilterAssistant === 'all'
                            ? `${tasks.length} görev kayıtlı`
                            : `${tasks.filter(t => t.assistantId === taskFilterAssistant).length} görev (${assistants.find(a => a.id === taskFilterAssistant)?.name})`
                          : `${tasks.filter(t => t.assistantId === currentUser?.id).length} görev kaydınız var`
                        }
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <Select value={taskFilterAssistant} onValueChange={setTaskFilterAssistant}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Kişi filtrele" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü ({tasks.length})</SelectItem>
                          {sortedByPoints.filter(a => a.isActive).map(ra => (
                            <SelectItem key={ra.id} value={ra.id}>{ra.name} ({ra.totalPoints}p)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {(isAdmin
                        ? taskFilterAssistant === 'all' ? tasks : tasks.filter(t => t.assistantId === taskFilterAssistant)
                        : tasks.filter(t => t.assistantId === currentUser?.id)
                      ).map(task => (
                        <div key={task.id} className={`p-3 rounded-xl border transition-all hover:border-slate-300 ${task.status === 'rejected' ? 'opacity-50 border-red-100' : task.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isAdmin && (
                                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{task.assistant?.name}</span>
                                )}
                                <span className="text-sm font-medium text-slate-900">{task.description}</span>
                                {task.category && <Badge variant="outline" className="text-[10px]">{task.category.name}</Badge>}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                <span>{new Date(task.date).toLocaleDateString('tr-TR')}</span>
                                {task.hoursWorked && <span>{task.hoursWorked}</span>}
                                <Badge variant="outline" className="text-[10px]">
                                  {task.source === 'auto_assigned' ? 'Otomatik' : task.source === 'import' ? 'İçe Aktarma' : task.source === 'temsilci_assigned' ? 'Temsilci' : 'Kendi Bildirimi'}
                                </Badge>
                                <Badge variant={task.status === 'approved' ? 'default' : task.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                                  {task.status === 'approved' ? 'Onaylı' : task.status === 'pending' ? 'Bekliyor' : 'Reddedildi'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-lg font-bold text-slate-900">{task.points}</span>
                                <span className="text-xs text-slate-400 ml-0.5">p</span>
                              </div>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(isAdmin
                        ? taskFilterAssistant === 'all' ? tasks : tasks.filter(t => t.assistantId === taskFilterAssistant)
                        : tasks.filter(t => t.assistantId === currentUser?.id)
                      ).length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Henüz görev kaydı yok</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EXAMS */}
          <TabsContent value="exams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" /> Yeni Sınav</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="text-sm">Ders Kodu</Label><Input placeholder="GMI201" value={examCourseCode} onChange={e => setExamCourseCode(e.target.value)} /></div>
                    <div className="space-y-2"><Label className="text-sm">Gözetmen</Label><Select value={examSupervisors} onValueChange={setExamSupervisors}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label className="text-sm">Ders Adı</Label><Input value={examCourseName} onChange={e => setExamCourseName(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-sm">Öğr. Üyesi</Label><Input value={examInstructor} onChange={e => setExamInstructor(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label className="text-sm">Tarih</Label><Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} /></div>
                    <div className="space-y-2"><Label className="text-sm">Gün</Label><Select value={examDay} onValueChange={setExamDay}><SelectTrigger><SelectValue placeholder="Gün" /></SelectTrigger><SelectContent>{Object.entries(DAY_NAMES).map(([k, v]) => <SelectItem key={k} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-2"><Label className="text-sm">Saat</Label><Input placeholder="09:00-11:00" value={examTime} onChange={e => setExamTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-sm">Notlar</Label><Input value={examNotes} onChange={e => setExamNotes(e.target.value)} /></div>
                  <Button onClick={handleSubmitExam} className="w-full bg-blue-600 hover:bg-blue-700 gap-2"><GraduationCap className="h-4 w-4" /> Ekle</Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md lg:col-span-2">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-600" /> Sınavlar & Gözetmen</CardTitle><CardDescription>{exams.length} sınav · {unassignedExams} gözetmen bekliyor</CardDescription></CardHeader>
                <CardContent><ScrollArea className="h-[600px]"><div className="space-y-4">
                  {exams.map(exam => (
                    <div key={exam.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2"><span className="font-bold text-slate-900">{exam.courseCode}</span><ChevronRight className="h-3 w-3 text-slate-300" /><span className="text-sm">{exam.courseName}</span></div>
                          <p className="text-xs text-slate-500">{exam.instructor}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{exam.day} · {new Date(exam.date).toLocaleDateString('tr-TR')}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{exam.timeSlot}</span>
                          </div>
                          {exam.notes && <p className="text-xs text-amber-600 mt-1">Not: {exam.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge variant={exam.supervisors.length >= exam.requiredSupervisors ? "default" : "destructive"} className="gap-1"><UserCheck className="h-3 w-3" />{exam.supervisors.length}/{exam.requiredSupervisors}</Badge>
                          {exam.supervisors.length < exam.requiredSupervisors && <Button size="sm" variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleAutoAssign(exam.id)}><Zap className="h-3 w-3" /> Otomatik Ata</Button>}
                        </div>
                      </div>
                      {exam.supervisors.length > 0 && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-400 mb-2">Atanan Gözetmenler:</p><div className="flex flex-wrap gap-2">{exam.supervisors.map(s => <Badge key={s.id} variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{s.assistant.name}</Badge>)}</div></div>}
                    </div>
                  ))}
                </div></ScrollArea></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SCHEDULE */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-violet-600" /> Program Ekle</CardTitle><CardDescription>Çakışma kontrolü aktif</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label className="text-sm">Araş Gör</Label><Select value={schedAssistantId} onValueChange={setSchedAssistantId}><SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger><SelectContent>{assistants.map(ra => <SelectItem key={ra.id} value={ra.id}>{ra.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-sm">Gün</Label><Select value={schedDay} onValueChange={setSchedDay}><SelectTrigger /><SelectContent>{Object.entries(DAY_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-sm">Saat</Label><Input placeholder="09:00-12:00" value={schedTime} onChange={e => setSchedTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-sm">Ders/Açıklama</Label><Input placeholder="GMIM Lisansüstü" value={schedDesc} onChange={e => setSchedDesc(e.target.value)} /></div>
                  <Button onClick={handleAddSchedule} className="w-full bg-violet-600 hover:bg-violet-700 gap-2"><CalendarDays className="h-4 w-4" /> Ekle</Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md lg:col-span-2">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-600" /> Haftalık Program</CardTitle><CardDescription>{weeklySchedules.length} kayıt</CardDescription></CardHeader>
                <CardContent>
                  <Table><TableHeader><TableRow><TableHead>Araş Gör</TableHead><TableHead>Gün</TableHead><TableHead>Saat</TableHead><TableHead>Ders</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>{weeklySchedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(s => (
                      <TableRow key={s.id}>
                        <TableCell><span className="text-sm font-medium">{s.assistant.name}</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{DAY_NAMES[s.dayOfWeek]}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{s.timeSlot}</TableCell>
                        <TableCell className="text-sm">{s.description}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteSchedule(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* IMPORT */}
          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-orange-600" /> Veri İçe Aktarma</CardTitle><CardDescription>CSV dosyasından toplu görev ve sınav aktarımı</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label className="text-sm">Tür</Label><Select value={importType} onValueChange={setImportType}><SelectTrigger /><SelectContent><SelectItem value="tasks">Görevler</SelectItem><SelectItem value="exams">Sınavlar</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-sm">Dosya (CSV)</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-orange-300">
                      <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <Input type="file" accept=".csv,.txt" onChange={e => setImportFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto" />
                    </div>
                  </div>
                  <Button onClick={handleImport} disabled={!importFile || isImporting} className="w-full bg-orange-600 hover:bg-orange-700 gap-2">
                    {isImporting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Upload className="h-4 w-4" />}
                    {isImporting ? 'Aktarılıyor...' : 'İçe Aktar'}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-orange-600" /> CSV Format Rehberi</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div><h4 className="font-semibold text-sm mb-2">Görev İçe Aktarma</h4>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                      <p className="text-emerald-400">İsim,Görev,Tarih,Puan,Saat</p>
                      <p>Y.Tarık MUTLU,MÜDEK toplantısı,21.07.2025,4,5</p>
                      <p>Fatih NACAR,Ders Programı,01.09.2025,3,11:00-16:00</p>
                    </div>
                  </div>
                  <Separator />
                  <div><h4 className="font-semibold text-sm mb-2">Sınav İçe Aktarma</h4>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                      <p className="text-blue-400">Ders Kodu,Ders Adı,Öğr. Üyesi,Tarih,Gün,Saat,Gözetmen</p>
                      <p>MEK,Engineering Mechanics,Banu Tansel,17.01.2026,Cumartesi,15:00-17:00,2</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-800 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> Excel'i CSV olarak kaydedip yükleyin. İsim eşleşmesi otomatik yapılır.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CATEGORIES */}
          <TabsContent value="categories" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /> Puan Baremi</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                      <div className="flex items-center justify-between"><h4 className="font-medium text-sm">{cat.name}</h4><Badge className="bg-amber-100 text-amber-800 font-bold">{cat.points} p</Badge></div>
                      {cat.description && <p className="text-xs text-slate-500 mt-1">{cat.description}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PERSONNEL */}
          <TabsContent value="personnel" className="space-y-6">
            {/* Admin: Add new person */}
            {isAdmin && (
              <Dialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4" /> Yeni Araş Gör Ekle</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Yeni Araş Gör Ekle</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Ad Soyad *</Label><Input placeholder="Ad Soyad" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>E-posta *</Label><Input placeholder="isim@itu.edu.tr" value={newPersonEmail} onChange={e => setNewPersonEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Telefon</Label><Input placeholder="0555 555 55 55" value={newPersonPhone} onChange={e => setNewPersonPhone(e.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Şifre</Label>
                      <Input placeholder="Boş bırakırsanız otomatik oluşturulur (eposta+2026)" value={newPersonPassword} onChange={e => setNewPersonPassword(e.target.value)} />
                      <p className="text-[11px] text-slate-400">Boş bırakılırsa varsayılan: e-posta önek + 2026</p>
                    </div>
                    <Button onClick={handleAddAssistant} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="h-4 w-4" /> Ekle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Pending duty changes for admin approval */}
            {isAdmin && (() => {
              const allPendingChanges = assistants.flatMap(a => (a.pendingDutyChanges || []).filter(c => c.status === 'pending').map(c => ({ ...c, assistantName: a.name })))
              return allPendingChanges.length > 0 && (
                <Card className="border-0 shadow-md border-l-4 border-l-amber-400">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-600" /> Bekleyen Daimi Görev Değişiklikleri</CardTitle><CardDescription>{allPendingChanges.length} talep bekliyor</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allPendingChanges.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">{c.assistantName}</span>
                              <span className="text-xs text-amber-600">{c.changeType === 'add' ? 'Ekleme' : c.changeType === 'edit' ? 'Düzenleme' : 'Silme'}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 mt-1">"{c.dutyName}"</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleDutyApproval(c.id, 'approve')}><Check className="h-3 w-3" /> Onayla</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50" onClick={() => handleDutyApproval(c.id, 'reject')}><XCircle className="h-3 w-3" /> Reddet</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistants.map(ra => (
                <Card key={ra.id} className={`border-0 shadow-md hover:shadow-lg transition-shadow ${!ra.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg ${!ra.isActive ? 'bg-gradient-to-br from-red-300 to-red-400 shadow-red-200' : ra.role === 'admin' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200' : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200'}`}>
                        {ra.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold truncate">{ra.name}</h3>
                          {ra.role === 'admin' && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-0.5"><Shield className="h-2.5 w-2.5" /> Temsilci</Badge>}
                          {!ra.isActive && <Badge className="bg-red-100 text-red-700 text-[10px]">Pasif</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{ra.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-xs">{ra.faculty} - {ra.department}</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">{ra.totalPoints} puan</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Daimi Görevler */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-400">Daimi Görevler:</p>
                        {(isAdmin || currentUser?.id === ra.id) && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-emerald-600 hover:bg-emerald-50" onClick={() => { setEditingDutyAssistantId(editingDutyAssistantId === ra.id ? null : ra.id); setNewDutyName('') }}>
                            <Plus className="h-3 w-3" /> Düzenle
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {ra.permanentDuties.map(pd => (
                          <div key={pd.id} className="flex items-center justify-between gap-2 text-xs text-slate-600 group">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
                              <span className="truncate">{pd.name}</span>
                            </div>
                            {editingDutyAssistantId === ra.id && (
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDutyChange(ra.id, 'delete', pd.name, pd.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        {ra.permanentDuties.length === 0 && <p className="text-xs text-slate-400 italic">Daimi görev yok</p>}
                        {/* Pending changes indicator for this assistant */}
                        {(ra.pendingDutyChanges || []).filter(c => c.status === 'pending').length > 0 && !isAdmin && currentUser?.id === ra.id && (
                          <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-[10px] text-amber-700 font-medium">Onay bekleyen değişiklikler:</p>
                            {ra.pendingDutyChanges.filter(c => c.status === 'pending').map(c => (
                              <div key={c.id} className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{c.changeType === 'add' ? 'Ekleme' : c.changeType === 'edit' ? 'Düzenleme' : 'Silme'}: "{c.dutyName}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add new duty input */}
                        {editingDutyAssistantId === ra.id && (
                          <div className="mt-2 flex gap-2">
                            <Input placeholder="Yeni görev adı" value={newDutyName} onChange={e => setNewDutyName(e.target.value)} className="h-7 text-xs" onKeyDown={e => {
                              if (e.key === 'Enter' && newDutyName.trim()) {
                                handleDutyChange(ra.id, 'add', newDutyName.trim())
                              }
                            }} />
                            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { if (newDutyName.trim()) handleDutyChange(ra.id, 'add', newDutyName.trim()) }} disabled={!newDutyName.trim()}>
                              <Plus className="h-3 w-3" /> Ekle
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Durum:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant={ra.isActive ? "outline" : "default"}
                              className={`text-xs gap-1 ${ra.isActive ? 'border-red-300 text-red-700 hover:bg-red-50' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/toggle-active', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ assistantId: ra.id, isActive: !ra.isActive }),
                                  })
                                  const data = await res.json()
                                  if (res.ok) { toast.success(data.message); fetchData() }
                                  else { toast.error(data.error) }
                                } catch { toast.error('Bağlantı hatası') }
                              }}
                            >
                              {ra.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleResetPassword(ra.id, ra.name)}>
                              Şifre Sıfırla
                            </Button>
                          </div>
                        </div>
                        {ra.role !== 'admin' && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRemoveAssistant(ra.id, ra.name)}>
                              <Trash2 className="h-3 w-3" /> Kaldır
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-400">
          <span>GMIM Ar.Gör Yönetim Sistemi · İTÜ Denizcilik Fakültesi</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Destekli v3.0</span>
        </div>
      </footer>
    </div>
  )
}
