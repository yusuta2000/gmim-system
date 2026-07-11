'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Users, ListChecks, GraduationCap, Brain, BarChart3, Plus, CheckCircle2,
  Clock, AlertCircle, UserCheck, Award, TrendingDown, Zap, Ship,
  CalendarDays, ChevronRight, Sparkles, Send, ArrowUpRight, Target,
  Bell, BellRing, Upload, FileSpreadsheet, LogIn, LogOut, Shield,
  Info, Trash2, XCircle, Check, RotateCcw, Settings2, Megaphone, MessageSquare, ChevronDown, Moon, Sun
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
interface PermanentDuty { id: string; name: string; description: string | null; order: number; assistantId: string }
interface PendingDutyChange { id: string; changeType: string; dutyName: string; description: string | null; status: string; assistantId: string; dutyId: string | null; submittedBy: string | null; createdAt: string }
interface Announcement {
  id: string; title: string; content: string; createdAt: string
  authorId: string; author: { id: string; name: string; role: string }
  comments: AnnouncementComment[]
}
interface AnnouncementComment {
  id: string; content: string; createdAt: string
  announcementId: string; authorId: string; author: { id: string; name: string; role: string }
}
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

// Faculty departments. The system is department-scoped: each department manages
// its own ar.görs, tasks, exams, schedule and announcements independently.
interface DeptInfo {
  code: string; short: string; full: string; accent: string; badge: string
  // Accent class profiles — single source for department theming (reduces ternary sprawl)
  logoGradient: string;   // gradient for logo/icon tiles
  iconText: string;       // accent text color for icons
  primaryBtn: string;     // primary button bg
  pageGradient: string;   // landing/login page background gradient
}
const DEPARTMENTS: Record<string, DeptInfo> = {
  GMIM: {
    code: 'GMIM', short: 'GMİM', full: 'Gemi Makineleri İşletme Mühendisliği', accent: 'emerald',
    badge: 'bg-emerald-100 text-emerald-800',
    logoGradient: 'from-emerald-500 to-teal-600 shadow-emerald-200',
    iconText: 'text-emerald-600', primaryBtn: 'bg-emerald-600 hover:bg-emerald-700',
    pageGradient: 'from-emerald-50 via-white to-teal-50',
  },
  DUIM: {
    code: 'DUIM', short: 'DUİM', full: 'Deniz Ulaştırma İşletme Mühendisliği', accent: 'sky',
    badge: 'bg-sky-100 text-sky-800',
    logoGradient: 'from-sky-500 to-indigo-600 shadow-sky-200',
    iconText: 'text-sky-600', primaryBtn: 'bg-sky-600 hover:bg-sky-700',
    pageGradient: 'from-sky-50 via-white to-indigo-50',
  },
}
const DEPT_LIST = Object.values(DEPARTMENTS)
type DepartmentCode = keyof typeof DEPARTMENTS

function normalizeDepartment(value: unknown): DepartmentCode | null {
  if (value === 'GMI') return 'GMIM'
  return typeof value === 'string' && value in DEPARTMENTS ? (value as DepartmentCode) : null
}

function readStoredUser(): ResearchAssistant | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('gmim_current_user')
    if (!stored) return null
    const user = JSON.parse(stored) as ResearchAssistant
    if (!user?.id || !normalizeDepartment(user.department)) {
      localStorage.removeItem('gmim_current_user')
      return null
    }
    return user
  } catch {
    localStorage.removeItem('gmim_current_user')
    return null
  }
}

async function jsonArray<T>(response: Response): Promise<T[]> {
  if (!response.ok) return []
  const data = await response.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

// Role label. The dekan is faculty-wide; in DUİM the same person (Özcan Arslan) is
// also the department head, so show "Dekan & Bölüm Bşk." when viewing DUİM.
function roleLabel(role: string, viewDept?: string | null): string {
  if (role === 'admin') return 'Temsilci'
  if (role === 'dekan') return viewDept === 'DUIM' ? 'Dekan & Bölüm Bşk.' : 'Dekan'
  if (role === 'baskan') return 'Bölüm Bşk.'
  return 'Ar.Gör'
}

// Standardized task status palette — single source for status colors/labels.
// Semantic: emerald=success(approved), amber=pending, blue=awaiting-response, red=rejected.
const TASK_STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Onaylı', cls: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Onay Bekliyor', cls: 'bg-amber-100 text-amber-800' },
  assigned: { label: 'Yanıt Bekleniyor', cls: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-700' },
}
function statusBadge(status: string): { label: string; cls: string } {
  return TASK_STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-700' }
}

export default function Home() {
  const [assistants, setAssistants] = useState<ResearchAssistant[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<PointCategory[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const tabsScrollRef = useRef<HTMLDivElement>(null)

  // Auth - localStorage'dan geri yükle
  const [currentUser, setCurrentUser] = useState<ResearchAssistant | null>(() => {
    return readStoredUser()
  })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  // Selected department (landing choice). For logged-in non-dekan users this always
  // equals their own department; the dekan can switch between departments.
  const [selectedDept, setSelectedDept] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const user = readStoredUser()
      if (user) {
        const userDept = normalizeDepartment(user.department)
        const storedDept = normalizeDepartment(localStorage.getItem('gmim_selected_dept'))
        return user.role === 'dekan' ? (storedDept || userDept) : userDept
      }
      const storedDept = normalizeDepartment(localStorage.getItem('gmim_selected_dept'))
      if (!storedDept) localStorage.removeItem('gmim_selected_dept')
      return storedDept
    } catch { return null }
  })
  // Normalize any legacy short code to the canonical one used throughout.
  const viewDept = normalizeDepartment(selectedDept)
  const deptInfo = viewDept ? DEPARTMENTS[viewDept] : null

  // Theme (dark mode) — persisted, applied to <html> via class.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    try { return (localStorage.getItem('gmim_theme') as 'light' | 'dark') || 'light' }
    catch { return 'light' }
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('gmim_theme', theme) } catch {}
  }, [theme])

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
  const [taskSortBy, setTaskSortBy] = useState<string>('date_desc')
  const [expandedAssistantId, setExpandedAssistantId] = useState<string | null>(null)

  // Permanent duty editing
  const [editingDutyAssistantId, setEditingDutyAssistantId] = useState<string | null>(null)
  const [newDutyName, setNewDutyName] = useState('')

  // Dialogs
  const [showNotifDialog, setShowNotifDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false)

  // Confirm dialogs (replace native confirm/prompt — FAZ 1)
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null)
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] = useState<string | null>(null)
  const [removeAssistantTarget, setRemoveAssistantTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; name: string } | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetConfirmText, setResetConfirmText] = useState('') // kullanıcı "SIFIRLA" yazar

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonEmail, setNewPersonEmail] = useState('')
  const [newPersonPhone, setNewPersonPhone] = useState('')
  const [newPersonPassword, setNewPersonPassword] = useState('')

  // Announcement form
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [commentText, setCommentText] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    // No department context yet (department not chosen) → nothing to load.
    if (!viewDept) { setLoading(false); return }
    setLoading(true)
    const q = `?department=${viewDept}`
    try {
      const [assRes, taskRes, catRes, examRes, notifRes, schedRes, pendRes, annRes] = await Promise.all([
        fetch(`/api/assistants${q}`), fetch(`/api/tasks${q}`), fetch('/api/categories'),
        fetch(`/api/exams${q}`),
        fetch(currentUser ? `/api/notifications?assistantId=${currentUser.id}` : '/api/notifications?assistantId=__none__'),
        fetch(`/api/weekly-schedule${q}`),
        fetch(`/api/approve-task${q}`), fetch(`/api/announcements${q}`),
      ])
      if (currentUser && [assRes, taskRes, catRes, examRes, notifRes, schedRes, pendRes, annRes].some(res => res.status === 401)) {
        setCurrentUser(null)
        try { localStorage.removeItem('gmim_current_user') } catch {}
        toast.error('Oturum süresi doldu', { description: 'Verileri görmek için tekrar giriş yapın.' })
        setAssistants([])
        setTasks([])
        setCategories([])
        setExams([])
        setNotifications([])
        setUnreadCount(0)
        setWeeklySchedules([])
        setPendingTasks([])
        setAnnouncements([])
        return
      }
      setAssistants(await jsonArray<ResearchAssistant>(assRes))
      setTasks(await jsonArray<Task>(taskRes))
      setCategories(await jsonArray<PointCategory>(catRes))
      setExams(await jsonArray<Exam>(examRes))
      const notifData = await notifRes.json()
      setNotifications(notifData.notifications || [])
      setUnreadCount(notifData.unreadCount || 0)
      setWeeklySchedules(await jsonArray<WeeklyScheduleItem>(schedRes))
      setPendingTasks(await jsonArray<Task>(pendRes))
      setAnnouncements(await jsonArray<Announcement>(annRes))
    } catch (err) { console.error(err); toast.error('Veriler yüklenirken hata') }
    finally { setLoading(false) }
  }, [viewDept, currentUser])

  useEffect(() => { fetchData() }, [fetchData])

  // Aktif sekme değişince onu yatay şeritte ortaya kaydır (mobilde kaybolmasın)
  useEffect(() => {
    const container = tabsScrollRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-state="active"]')
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeTab])

  const isAdmin = currentUser?.role === 'admin'
  const isDekan = currentUser?.role === 'dekan'
  const isBaskan = currentUser?.role === 'baskan'
  // Dekan ve Bölüm Başkanı, temsilci ile AYNI erişime sahip (yönetici seviyesi)
  const isManager = isAdmin || isDekan || isBaskan
  const isArGor = currentUser?.role === 'user'
  // Yöneticiler (temsilci, dekan, baskan) tüm listeyi görür ve düzenleyebilir
  const canSeeAll = isManager
  const canEdit = isManager

  // Auth
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { toast.error('E-posta ve şifre gerekli'); return }
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, department: viewDept }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentUser(data.user)
        try { localStorage.setItem('gmim_current_user', JSON.stringify(data.user)) } catch {}
        // Lock the view to the user's own department (dekan keeps the chosen one).
        const effectiveDept = data.user.role === 'dekan' ? (viewDept || data.user.department) : data.user.department
        setSelectedDept(effectiveDept)
        try { localStorage.setItem('gmim_selected_dept', effectiveDept) } catch {}
        setShowLoginDialog(false); setLoginEmail(''); setLoginPassword('')
        toast.success(`Hoş geldiniz, ${data.user.name}!`, { description: roleLabel(data.user.role, effectiveDept) })
        // Rol bazlı default tab
        const role = data.user.role
        setActiveTab(role === 'admin' || role === 'dekan' || role === 'baskan' ? 'dashboard' : 'tasks')
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
    const source = canEdit ? 'temsilci_assigned' : 'external'
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
        toast.success(canEdit ? 'Görev atandı!' : 'Görev temsilci onayına gönderildi!', {
          description: canEdit ? 'Araş görün kabul etmesi bekleniyor' : 'Onaylandıktan sonra puan eklenecek'
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
          department: viewDept,
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
      const formData = new FormData(); formData.append('file', importFile); formData.append('type', importType); formData.append('department', viewDept || '')
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
    if (!currentUser || !canEdit) return
    try {
      const carryOverPoints = action === 'archive'
        ? Object.fromEntries(assistants.map(a => [a.id, a.totalPoints]))
        : undefined
      const res = await fetch('/api/reset-period', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, carryOverPoints, department: viewDept }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setShowResetDialog(false); setResetConfirmText(''); fetchData()
      }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Delete task (admin only) — opt.
  const performDeleteTask = async (task: Task) => {
    if (!currentUser || !canEdit) return
    try {
      const res = await fetch(`/api/delete-task?id=${task.id}&requesterId=${currentUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Görev silindi', {
          description: `${task.assistant?.name || 'Kişi'} · ${task.description}`,
          action: { label: 'Geri Al', onClick: () => restoreTask(task) },
        })
        fetchData()
      }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Undo task deletion — re-create the task with its original attributes.
  const restoreTask = async (task: Task) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: task.description, date: task.date, hoursWorked: task.hoursWorked || null,
          assistantId: task.assistantId, categoryId: task.categoryId || null,
          points: task.points, source: task.source, notes: task.notes || null,
          assignedBy: currentUser?.id || null,
        }),
      })
      if (res.ok) { toast.success('Görev geri yüklendi'); fetchData() }
      else { toast.error('Geri yükleme başarısız') }
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
          isDirectAdmin: canEdit,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(canEdit ? 'Daimi görev güncellendi' : 'Değişiklik talebi gönderildi, onay bekleniyor')
        setEditingDutyAssistantId(null); setNewDutyName('')
        fetchData()
      } else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Approve/reject pending duty change
  const handleDutyApproval = async (changeId: string, action: 'approve' | 'reject') => {
    if (!currentUser || !canEdit) return
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

  // Admin reset password — opens a Dialog (replaces native prompt)
  const openResetPasswordDialog = (assistantId: string, assistantName: string) => {
    setResetPasswordTarget({ id: assistantId, name: assistantName }); setResetPasswordValue('')
  }
  const performResetPassword = async () => {
    if (!currentUser || !resetPasswordTarget) return
    if (!resetPasswordValue || resetPasswordValue.length < 4) { toast.error('Şifre en az 4 karakter olmalı'); return }
    try {
      const res = await fetch('/api/reset-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId: resetPasswordTarget.id, newPassword: resetPasswordValue, requesterId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setResetPasswordTarget(null); setResetPasswordValue('')
      }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Add new assistant
  const handleAddAssistant = async () => {
    if (!currentUser || !canEdit) return
    if (!newPersonName || !newPersonEmail) { toast.error('Ad ve e-posta gerekli'); return }
    try {
      const res = await fetch('/api/add-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersonName, email: newPersonEmail, phone: newPersonPhone || null,
          password: newPersonPassword || undefined, requesterId: currentUser.id,
          department: viewDept,
        }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setShowAddPersonDialog(false); setNewPersonName(''); setNewPersonEmail(''); setNewPersonPhone(''); setNewPersonPassword(''); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Remove assistant — opt. confirmation now via AlertDialog (replaces native confirm)
  const performRemoveAssistant = async () => {
    if (!currentUser || !removeAssistantTarget) return
    try {
      const res = await fetch(`/api/remove-assistant?id=${removeAssistantTarget.id}&requesterId=${currentUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setRemoveAssistantTarget(null); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Export Excel
  const handleExportExcel = async (type: string) => {
    try {
      const res = await fetch(`/api/export-excel?type=${type}&department=${viewDept}`)
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

  // Create announcement
  const handleCreateAnnouncement = async () => {
    if (!currentUser || !canEdit) return
    if (!annTitle || !annContent) { toast.error('Başlık ve içerik gerekli'); return }
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: annTitle, content: annContent, authorId: currentUser.id, department: viewDept }),
      })
      const data = await res.json()
      if (res.ok) { toast.success('Duyuru oluşturuldu'); setAnnTitle(''); setAnnContent(''); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Add comment
  const handleAddComment = async (announcementId: string) => {
    if (!currentUser) return
    const content = commentText[announcementId]
    if (!content) { toast.error('Yorum boş olamaz'); return }
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId, content, authorId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setCommentText({ ...commentText, [announcementId]: '' })
        fetchData()
      } else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Delete announcement — opt. confirmation now via AlertDialog (replaces native confirm)
  const performDeleteAnnouncement = async () => {
    if (!currentUser || !deleteAnnouncementTarget) return
    try {
      const res = await fetch(`/api/announcements?id=${deleteAnnouncementTarget}&requesterId=${currentUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); setDeleteAnnouncementTarget(null); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Respond to assigned task (accept/reject)
  const handleRespondTask = async (taskId: string, action: 'accept' | 'reject') => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/respond-task', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action, responderId: currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message); fetchData() }
      else { toast.error(data.error) }
    } catch { toast.error('Bağlantı hatası') }
  }

  // Computed
  const totalTasks = tasks.length
  const pendingCount = pendingTasks.length
  // Dekan ve Bölüm Başkanı puan/görev listelerinde görünmez - sadece ar.gör ve temsilci
  const arGorAssistants = assistants.filter(a => a.role === 'admin' || a.role === 'user')
  const managerAssistants = assistants.filter(a => a.role === 'dekan' || a.role === 'baskan')
  const activeAssistants = arGorAssistants.filter(a => a.isActive)
  const maxPoints = Math.max(...activeAssistants.map(a => a.totalPoints), 1)
  const minPA = activeAssistants.length > 0 ? [...activeAssistants].sort((a, b) => a.totalPoints - b.totalPoints)[0] : null
  const unassignedExams = exams.filter(e => e.supervisors.length < e.requiredSupervisors).length
  const sortedByPoints = [...arGorAssistants].sort((a, b) => a.totalPoints - b.totalPoints)

  // Sort tasks based on selected sort option
  const sortTasks = (taskList: Task[]) => {
    const sorted = [...taskList]
    switch (taskSortBy) {
      case 'date_desc': return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      case 'date_asc': return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'points_asc': return sorted.sort((a, b) => a.points - b.points)
      case 'points_desc': return sorted.sort((a, b) => b.points - a.points)
      default: return sorted
    }
  }

  // Get statistics for a specific assistant
  const getAssistantStats = (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId)
    if (!assistant) return null
    const myTasks = tasks.filter(t => t.assistantId === assistantId && t.status === 'approved')
    const totalApprovedPoints = assistants.reduce((sum, a) => sum + a.totalPoints, 0) || 1
    const mySharePct = (assistant.totalPoints / totalApprovedPoints) * 100
    // Category distribution
    const categoryDist: { [key: string]: { points: number; count: number; name: string } } = {}
    myTasks.forEach(t => {
      const catName = t.category?.name || 'Diğer'
      if (!categoryDist[catName]) categoryDist[catName] = { points: 0, count: 0, name: catName }
      categoryDist[catName].points += t.points
      categoryDist[catName].count += 1
    })
    const categoryArr = Object.values(categoryDist).sort((a, b) => b.points - a.points)
    const totalTasksInSystem = tasks.filter(t => t.status === 'approved').length || 1
    const taskCountPct = (myTasks.length / totalTasksInSystem) * 100
    return {
      assistant,
      taskCount: myTasks.length,
      mySharePct,
      taskCountPct,
      categoryArr,
      avgPointsPerTask: myTasks.length > 0 ? assistant.totalPoints / myTasks.length : 0,
      lastTaskDate: myTasks.length > 0 ? myTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null,
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-600 font-medium">GMIM Sistemi Yükleniyor...</p>
      </div>
    </div>
  }

  // Bölüm seçim ekranı - hangi bölüme giriş yapılacağı seçilir
  if (!currentUser && !viewDept) {
    const chooseDept = (code: string) => { setSelectedDept(code); try { localStorage.setItem('gmim_selected_dept', code) } catch {} }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg mx-auto mb-4">
              <Ship className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">İTÜ Denizcilik Fakültesi</h1>
            <p className="text-sm text-slate-500 mt-1">Ar.Gör Yönetim Sistemi · Bölüm seçin</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <button onClick={() => chooseDept('GMIM')} className="group text-left rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow mb-4"><Ship className="h-6 w-6 text-white" /></div>
              <h2 className="text-xl font-bold text-slate-900">GMİM</h2>
              <p className="text-sm text-slate-500 mt-1">Gemi Makineleri İşletme Mühendisliği</p>
              <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium mt-4 group-hover:gap-2 transition-all">Giriş yap <ChevronRight className="h-4 w-4" /></span>
            </button>
            <button onClick={() => chooseDept('DUIM')} className="group text-left rounded-2xl border-2 border-sky-200 bg-white p-6 shadow-sm hover:shadow-xl hover:border-sky-400 transition-all">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow mb-4"><Ship className="h-6 w-6 text-white" /></div>
              <h2 className="text-xl font-bold text-slate-900">DUİM</h2>
              <p className="text-sm text-slate-500 mt-1">Deniz Ulaştırma İşletme Mühendisliği</p>
              <span className="inline-flex items-center gap-1 text-sky-700 text-sm font-medium mt-4 group-hover:gap-2 transition-all">Giriş yap <ChevronRight className="h-4 w-4" /></span>
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-500 mt-8">İTÜ DF Ar.Gör Yönetim Sistemi · AI Destekli v3.1</p>
        </div>
      </div>
    )
  }

  // Giriş ekranı - kullanıcı girişi yapmadan içerik gösterilmez
  if (!currentUser) {
    const pageGrad = deptInfo?.pageGradient || 'from-slate-50 via-white to-slate-50'
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${pageGrad} p-4`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${deptInfo?.logoGradient} flex items-center justify-center shadow-lg mx-auto mb-4`}>
              <Ship className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{deptInfo?.short} Ar.Gör Yönetim</h1>
            <p className="text-sm text-slate-500 mt-1">İTÜ Denizcilik Fakültesi · {deptInfo?.full}</p>
          </div>
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><LogIn className={`h-5 w-5 ${deptInfo?.iconText}`} /> Sisteme Giriş</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-posta</Label>
                <Input id="login-email" placeholder="isim@itu.edu.tr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Şifre</Label>
                <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
              </div>
              <Button onClick={handleLogin} className={`w-full ${deptInfo?.primaryBtn} gap-2`}><LogIn className="h-4 w-4" /> Giriş Yap</Button>
              <Button variant="ghost" onClick={() => { setSelectedDept(null); try { localStorage.removeItem('gmim_selected_dept') } catch {} }} className="w-full text-slate-500 gap-2 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Bölüm değiştir</Button>
            </CardContent>
          </Card>
          <p className="text-center text-[11px] text-slate-500 mt-6">{deptInfo?.short} Ar.Gör Yönetim Sistemi · AI Destekli v3.1</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
          {/* Sol: logo + başlık (daralabilir) */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${deptInfo?.logoGradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <Ship className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 min-w-0">
                <span className="truncate">{deptInfo?.short} Ar.Gör Yönetim</span>
                <Badge className={`${deptInfo?.badge} text-[10px] flex-shrink-0`}>{deptInfo?.short}</Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">İTÜ Denizcilik Fakültesi · {deptInfo?.full}</p>
            </div>
            {isDekan && (
              <Select value={viewDept || 'GMIM'} onValueChange={(v) => { setSelectedDept(v); try { localStorage.setItem('gmim_selected_dept', v) } catch {} }}>
                <SelectTrigger className="h-8 w-[100px] text-xs flex-shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_LIST.map(d => <SelectItem key={d.code} value={d.code} className="text-xs">{d.short}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Sağ: aksiyonlar (taşmasın) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {pendingCount > 0 && canSeeAll && (
              <Badge className="bg-amber-100 text-amber-800 gap-1 text-xs animate-pulse">
                <Clock className="h-3 w-3" /><span className="hidden sm:inline">{pendingCount} Onay Bekliyor</span><span className="sm:hidden">{pendingCount}</span>
              </Badge>
            )}
            <Dialog open={showNotifDialog} onOpenChange={setShowNotifDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Bildirimler">
                  {unreadCount > 0 ? <BellRing className="h-4 w-4 text-amber-500" /> : <Bell className="h-4 w-4 text-slate-500" />}
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Bildirimler</DialogTitle></DialogHeader>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? <p className="text-sm text-slate-500 text-center py-8">Bildirim yok</p> : (
                    <div className="space-y-2">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 rounded-lg border ${n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Badge className={`gap-1 text-xs ${isAdmin ? 'bg-emerald-100 text-emerald-800' : isDekan ? 'bg-violet-100 text-violet-800' : isBaskan ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                  <Shield className="h-3 w-3" /><span className="hidden sm:inline">{roleLabel(currentUser.role, viewDept)}</span>
                </Badge>
                <span className="text-xs text-slate-600 hidden md:inline">{currentUser.name}</span>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" title="Şifre Değiştir" aria-label="Şifre değiştir"><Settings2 className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Şifre Değiştir</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label htmlFor="pwd-current">Mevcut Şifre</Label><Input id="pwd-current" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
                      <div className="space-y-2"><Label htmlFor="pwd-new">Yeni Şifre</Label><Input id="pwd-new" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="En az 4 karakter" autoComplete="new-password" /></div>
                      <Button onClick={handleChangePassword} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><Check className="h-4 w-4" /> Değiştir</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Çıkış yap" onClick={() => { setCurrentUser(null); try { localStorage.removeItem('gmim_current_user') } catch {}; setActiveTab('dashboard'); toast.info('Çıkış yapıldı') }}><LogOut className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1 text-xs"><LogIn className="h-3.5 w-3.5" /> Giriş</Button></DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" /> Sisteme Giriş</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="login-email-2">E-posta</Label><Input id="login-email-2" placeholder="isim@itu.edu.tr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" /></div>
                    <div className="space-y-2"><Label htmlFor="login-password-2">Şifre</Label><Input id="login-password-2" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" /></div>
                    <Button onClick={handleLogin} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><LogIn className="h-4 w-4" /> Giriş Yap</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Kaydırılabilir sekme şeridi + kenar fade ipucu */}
          <div className="relative">
            <div ref={tabsScrollRef} className="overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-auto min-w-full grid-cols-none gap-1 bg-slate-100 p-1 rounded-xl h-auto">
                {[
                  { v: 'dashboard', icon: BarChart3, label: 'Puan Tablosu', short: 'Puan' },
                  { v: 'announcements', icon: Megaphone, label: 'Duyurular', short: 'Duyuru' },
                  { v: 'approvals', icon: CheckCircle2, label: 'Onaylar', short: 'Onay', badge: pendingCount, managerOnly: true },
                  { v: 'tasks', icon: ListChecks, label: 'Görevler', short: 'Görev', badge: isArGor ? tasks.filter(t => t.assistantId === currentUser?.id && t.status === 'assigned').length : 0 },
                  { v: 'exams', icon: GraduationCap, label: 'Sınavlar', short: 'Sınav' },
                  { v: 'schedule', icon: CalendarDays, label: 'Program', short: 'Prog.' },
                  { v: 'personnel', icon: Users, label: 'Personel', short: 'Kişiler' },
                ].filter(tab => !tab.managerOnly || isManager).map(tab => (
                  <TabsTrigger key={tab.v} value={tab.v} className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2 px-3 whitespace-nowrap relative">
                    <tab.icon className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{tab.label}</span><span className="sm:hidden">{tab.short}</span>
                    {tab.badge && tab.badge > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-600 text-[10px] text-white flex items-center justify-center font-bold">{tab.badge}</span>}
                  </TabsTrigger>
                ))}
                {/* Düşük sıklıklı yönetim araçları tek menüde — sekme sayısını azaltır */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex items-center rounded-lg py-2 px-3 whitespace-nowrap text-xs sm:text-sm transition-colors ${(activeTab === 'import' || activeTab === 'categories') ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
                    >
                      <Settings2 className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Yönetim</span><span className="sm:hidden">Daha</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {isManager && (
                      <DropdownMenuItem onClick={() => setActiveTab('import')} className={activeTab === 'import' ? 'bg-slate-100' : ''}>
                        <Upload className="h-4 w-4 mr-2" /> Veri Aktar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setActiveTab('categories')} className={activeTab === 'categories' ? 'bg-slate-100' : ''}>
                      <Award className="h-4 w-4 mr-2" /> Puan Baremi
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TabsList>
            </div>
            {/* Kenar fade ipucu: daha fazla sekme olduğunu gösterir (mobilde) */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-100 to-transparent sm:hidden" />
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

            {canEdit && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Güvenli indirme aksiyonları */}
                <div className="flex items-center gap-2 flex-wrap">
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
                {/* Yıkıcı işlem — görsel ayrı (kırmızı vurgu) */}
                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs border-red-300 text-red-700 hover:bg-red-50">
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

                      {/* Taşı — güvenli */}
                      <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1 border-emerald-300 hover:bg-emerald-50" onClick={() => handleResetPeriod('archive')}>
                        <span className="text-xs font-semibold text-emerald-800">Puanları Taşı</span>
                        <span className="text-[10px] text-emerald-600">Mevcut puanlar yeni döneme aktarılır</span>
                      </Button>

                      {/* Sıfırla — yazılı onay (yıkıcı) */}
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700">
                            <strong className="font-semibold">Bu işlem {activeAssistants.length} aktif araş. görün tüm puanını kalıcı olarak 0 yapacak.</strong> Geri alınamaz.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-red-700 font-medium">Onaylamak için <span className="font-mono font-bold">SIFIRLA</span> yazın</Label>
                          <Input
                            value={resetConfirmText}
                            onChange={e => setResetConfirmText(e.target.value)}
                            placeholder="SIFIRLA"
                            autoComplete="off"
                            className="h-8"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          className="w-full gap-1"
                          disabled={resetConfirmText.trim().toUpperCase() !== 'SIFIRLA'}
                          onClick={() => handleResetPeriod('reset')}
                        >
                          <RotateCcw className="h-4 w-4" /> Tüm Puanları Sıfırla
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                  {sortedByPoints.filter(ra => ra.isActive).map((ra, idx) => {
                    const isExpanded = expandedAssistantId === ra.id
                    const stats = isExpanded && canSeeAll ? getAssistantStats(ra.id) : null
                    return (
                    <div key={ra.id} className={`rounded-xl transition-all ${idx === 0 ? 'bg-emerald-50 border border-emerald-200' : ''} ${canSeeAll ? 'cursor-pointer hover:bg-slate-50' : ''}`}>
                      <div
                        className={`flex items-center gap-4 p-3 ${canSeeAll ? 'cursor-pointer' : ''}`}
                        onClick={() => canSeeAll && setExpandedAssistantId(isExpanded ? null : ra.id)}
                        onKeyDown={(e) => { if (canSeeAll && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedAssistantId(isExpanded ? null : ra.id) } }}
                        role={canSeeAll ? 'button' : undefined}
                        tabIndex={canSeeAll ? 0 : undefined}
                        aria-expanded={canSeeAll ? isExpanded : undefined}
                        aria-label={canSeeAll ? `${ra.name} detayları (${isExpanded ? 'kapat' : 'aç'})` : undefined}
                      >
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-emerald-600 text-white' : idx === 1 ? 'bg-amber-600 text-white' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 truncate">{ra.name}</span>
                            {idx === 0 && <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5"><Zap className="h-2.5 w-2.5" /> ÖNCELİKLİ</Badge>}
                            {ra.role === 'admin' && <Badge className="bg-slate-700 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5"><Shield className="h-2.5 w-2.5" /> TEMSİLCİ</Badge>}
                            {canSeeAll && <ChevronRight className={`h-3.5 w-3.5 text-slate-500 ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                          </div>
                          <Progress value={(ra.totalPoints / maxPoints) * 100} className="h-2 mt-1.5" />
                        </div>
                        <div className="text-right flex-shrink-0"><span className="text-lg font-bold text-slate-900">{ra.totalPoints}</span><span className="text-xs text-slate-500 ml-1">puan</span></div>
                      </div>
                      {/* Akordiyon istatistikler - sadece admin için */}
                      {isExpanded && stats && (
                        <div className="px-3 pb-3 border-t border-slate-100 pt-3 mt-1 space-y-4">
                          {/* Özet kartlar */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                              <p className="text-[10px] text-emerald-600 font-medium">Toplam Puan</p>
                              <p className="text-lg font-bold text-emerald-900">{stats.assistant.totalPoints}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                              <p className="text-[10px] text-blue-600 font-medium">Görev Sayısı</p>
                              <p className="text-lg font-bold text-blue-900">{stats.taskCount}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                              <p className="text-[10px] text-violet-600 font-medium">Ortalama Puan</p>
                              <p className="text-lg font-bold text-violet-900">{stats.avgPointsPerTask.toFixed(1)}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                              <p className="text-[10px] text-amber-600 font-medium">Sistemdeki Payı</p>
                              <p className="text-lg font-bold text-amber-900">%{stats.mySharePct.toFixed(1)}</p>
                            </div>
                          </div>

                          {/* İki panel yan yana */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Puan dağılımı (yatay bar) */}
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-700 mb-2">Kategoriye Göre Puan Dağılımı</p>
                              {stats.categoryArr.length > 0 ? (
                                <div className="space-y-1.5">
                                  {stats.categoryArr.slice(0, 6).map(cat => {
                                    const pct = (cat.points / stats.assistant.totalPoints) * 100
                                    return (
                                      <div key={cat.name}>
                                        <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                                          <span className="truncate">{cat.name} <span className="text-slate-500">({cat.count} görev)</span></span>
                                          <span className="font-semibold">{cat.points}p</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : <p className="text-[11px] text-slate-500">Henüz onaylı görev yok</p>}
                            </div>

                            {/* Sistem payı pasta grafik */}
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <p className="text-xs font-semibold text-slate-700 mb-2">Sistemdeki Görev Payı</p>
                              <div className="flex items-center gap-3">
                                <div className="relative w-20 h-20 flex-shrink-0">
                                  <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                                    <circle
                                      cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="4"
                                      strokeDasharray={`${stats.taskCountPct * 0.977} 100`}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-bold text-emerald-700">%{stats.taskCountPct.toFixed(0)}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-600 space-y-1">
                                  <p><span className="font-semibold text-slate-900">{stats.taskCount}</span> görev / toplam {tasks.filter(t => t.status === 'approved').length}</p>
                                  <p className="text-[11px] text-slate-500">Bu kişi sistemdeki tüm onaylı görevlerin %{stats.taskCountPct.toFixed(1)}'ine sahip</p>
                                  <p className="text-[11px] text-slate-500">Puan payı: %{stats.mySharePct.toFixed(1)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Son görev ve özet */}
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span>Son görev: {stats.lastTaskDate ? new Date(stats.lastTaskDate).toLocaleDateString('tr-TR') : 'Yok'}</span>
                            <span>Puan/Görev: {stats.avgPointsPerTask.toFixed(2)} p</span>
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })}
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
                          <div className="text-right flex-shrink-0"><span className="text-lg font-bold text-slate-500">{ra.totalPoints}</span><span className="text-xs text-slate-500 ml-1">puan</span></div>
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

          {/* ANNOUNCEMENTS */}
          <TabsContent value="announcements" className="space-y-6">
            {canEdit && (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-violet-600" /> Yeni Duyuru</CardTitle><CardDescription>Tüm araş görlerle paylaşın</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Duyuru başlığı" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
                  <Textarea placeholder="Duyuru içeriği (örn: 'İki hafta sonraki MÜDEK hazırlıkları için müsaitlik durumunuzu yorum olarak yazın')" value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} />
                  <Button onClick={handleCreateAnnouncement} disabled={!annTitle || !annContent} className="bg-violet-600 hover:bg-violet-700 gap-2"><Send className="h-4 w-4" /> Yayınla</Button>
                </CardContent>
              </Card>
            )}
            {announcements.length === 0 ? (
              <Card className="border-0 shadow-md"><CardContent className="p-8 text-center">
                <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700">Henüz duyuru yok</h3>
                <p className="text-sm text-slate-500">{canEdit ? 'İlk duyurunuzu oluşturun.' : 'Temsilci duyuru paylaştığında burada görünecek.'}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => (
                  <Card key={ann.id} className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-violet-600" /> {ann.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {ann.author.name} · {new Date(ann.createdAt).toLocaleString('tr-TR')}
                          </CardDescription>
                        </div>
                        {canEdit && ann.authorId === currentUser?.id && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteAnnouncementTarget(ann.id)} aria-label="Duyuruyu sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{ann.content}</p>
                      {ann.comments.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Yorumlar ({ann.comments.length})</p>
                          {ann.comments.map(c => (
                            <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${c.author.role === 'admin' ? 'bg-emerald-500' : c.author.role === 'dekan' ? 'bg-violet-500' : c.author.role === 'baskan' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                                {c.author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-slate-700">{c.author.name}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleString('tr-TR')}</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-0.5">{c.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Comment input */}
                      <div className="flex gap-2 pt-2">
                        <Input
                          placeholder="Müsaitlik durumunuzu yazın..."
                          value={commentText[ann.id] || ''}
                          onChange={e => setCommentText({ ...commentText, [ann.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter' && commentText[ann.id]) handleAddComment(ann.id) }}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={() => handleAddComment(ann.id)} disabled={!commentText[ann.id]} className="bg-violet-600 hover:bg-violet-700 gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> Yanıtla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* APPROVALS */}
          <TabsContent value="approvals" className="space-y-6">
            {!canEdit ? (
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
                <Card className="shadow-md border border-amber-200 bg-amber-50/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="h-6 w-6 text-amber-600" />
                    <div><p className="font-semibold text-amber-800">{pendingTasks.length} görev onay bekliyor</p><p className="text-xs text-amber-600">Araş görler tarafından gönderilen görevler aşağıda listeleniyor</p></div>
                  </CardContent>
                </Card>
                {pendingTasks.map(task => (
                  <Card key={task.id} className="shadow-md border border-amber-200 bg-amber-50/40">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{task.assistant?.name}</Badge>
                            <span className="text-xs text-slate-500">{new Date(task.date).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <p className="font-medium text-slate-900">{task.description}</p>
                          {task.hoursWorked && <p className="text-xs text-slate-500">Saat: {task.hoursWorked}</p>}
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 text-xs">{task.points} puan</Badge>
                            {task.category && <Badge variant="outline" className="text-xs">{task.category.name}</Badge>}
                          </div>
                          {task.notes && <p className="text-xs text-slate-500 italic">Not: {task.notes}</p>}
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

            {/* Pending duty changes in approvals tab */}
            {(() => {
              const allPendingChanges = assistants.flatMap(a => (a.pendingDutyChanges || []).filter(c => c.status === 'pending').map(c => ({ ...c, assistantName: a.name })))
              return allPendingChanges.length > 0 && (
                <Card className="shadow-md border border-amber-200 bg-amber-50/40 mt-6">
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
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tüm Görevler / İş Geçmişim - SOLD A */}
              <Card className="border-0 shadow-md lg:col-span-2 order-1 lg:order-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-slate-700" />
                        {canSeeAll ? 'Tüm Görevler' : 'İş Geçmişim'}
                      </CardTitle>
                      <CardDescription>
                        {canSeeAll
                          ? taskFilterAssistant === 'all'
                            ? `${tasks.length} görev kayıtlı`
                            : `${tasks.filter(t => t.assistantId === taskFilterAssistant).length} görev (${assistants.find(a => a.id === taskFilterAssistant)?.name})`
                          : `${tasks.filter(t => t.assistantId === currentUser?.id).length} görev kaydınız var`
                        }
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {canSeeAll && (
                        <Select value={taskFilterAssistant} onValueChange={setTaskFilterAssistant}>
                          <SelectTrigger className="w-44"><SelectValue placeholder="Kişi filtrele" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tümü ({tasks.length})</SelectItem>
                            {sortedByPoints.filter(a => a.isActive).map(ra => (
                              <SelectItem key={ra.id} value={ra.id}>{ra.name} ({ra.totalPoints}p)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={taskSortBy} onValueChange={setTaskSortBy}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Sırala" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date_desc">Tarih (En Yeni)</SelectItem>
                          <SelectItem value="date_asc">Tarih (En Eski)</SelectItem>
                          <SelectItem value="points_asc">Puan (En Az)</SelectItem>
                          <SelectItem value="points_desc">Puan (En Çok)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {sortTasks(canSeeAll
                        ? taskFilterAssistant === 'all' ? tasks : tasks.filter(t => t.assistantId === taskFilterAssistant)
                        : tasks.filter(t => t.assistantId === currentUser?.id)
                      ).map(task => (
                        <div key={task.id} className={`p-3 rounded-xl border transition-all hover:border-slate-300 ${task.status === 'rejected' ? 'opacity-50 border-red-100' : task.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {canEdit && (
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
                                <Badge className={`text-[10px] ${statusBadge(task.status).cls}`}>
                                  {statusBadge(task.status).label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {task.status === 'assigned' && task.assistantId === currentUser?.id && (
                                <div className="flex items-center gap-1">
                                  <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleRespondTask(task.id, 'accept')}>
                                    <Check className="h-3 w-3" /> Kabul
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50" onClick={() => handleRespondTask(task.id, 'reject')}>
                                    <XCircle className="h-3 w-3" /> Red
                                  </Button>
                                </div>
                              )}
                              <div className="text-right">
                                <span className="text-lg font-bold text-slate-900">{task.points}</span>
                                <span className="text-xs text-slate-500 ml-0.5">p</span>
                              </div>
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTaskTarget(task)} aria-label="Görevi sil">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {sortTasks(canSeeAll
                        ? taskFilterAssistant === 'all' ? tasks : tasks.filter(t => t.assistantId === taskFilterAssistant)
                        : tasks.filter(t => t.assistantId === currentUser?.id)
                      ).length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Henüz görev kaydı yok</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Görev Ata / Görev Bildir - SAĞDA */}
              <Card className="border-0 shadow-md lg:col-span-1 order-2 lg:order-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" /> {canEdit ? 'Görev Ata' : 'Görev Bildir'}</CardTitle>
                  <CardDescription>{canEdit ? 'Araş görle görev atayın' : 'Yaptığınız işi bildirin, temsilci onaylasın'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Görev Açıklaması</Label>
                    <div className="flex gap-2">
                      <Textarea placeholder={canEdit ? "Örn: MÜDEK toplantısı" : "Örn: Dün MÜDEK toplantısına 3 saat katıldım"} value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="resize-none" rows={2} />
                      <Button size="icon" variant="outline" className="flex-shrink-0 h-auto min-h-[40px] border-emerald-300 hover:bg-emerald-50" aria-label="AI ile kategori eşleştir" onClick={handleClassifyTask} disabled={isClassifying || !taskDesc.trim()}>
                        {isClassifying ? <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1"><Brain className="h-3 w-3" /> AI otomatik kategori eşleştirme</p>
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
                  {!canEdit && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-800 flex items-center gap-1"><Info className="h-3.5 w-3.5 flex-shrink-0" /> Göreviniz temsilci onayına gönderilecek. Onaylandıktan sonra puanınız eklenecektir.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Araş Gör</Label>
                    <Select value={taskAssistantId} onValueChange={setTaskAssistantId}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {!canEdit ? (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <Send className="h-4 w-4" /> {canEdit ? 'Görevi Ata' : 'Görevi Gönder (Onaya)'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EXAMS */}
          <TabsContent value="exams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sınavlar & Gözetmen - SOLDA */}
              <Card className={`border-0 shadow-md order-1 ${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-600" /> Sınavlar & Gözetmen</CardTitle><CardDescription>{exams.length} sınav{canEdit ? ` · ${unassignedExams} gözetmen bekliyor` : ''}</CardDescription></CardHeader>
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
                      {exam.supervisors.length > 0 && <div className="mt-3 pt-3 border-t border-slate-100"><p className="text-xs text-slate-500 mb-2">Atanan Gözetmenler:</p><div className="flex flex-wrap gap-2">{exam.supervisors.map(s => <Badge key={s.id} variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{s.assistant.name}</Badge>)}</div></div>}
                    </div>
                  ))}
                </div></ScrollArea></CardContent>
              </Card>
              {/* Yeni Sınav Ekle - SAĞDA */}
              {canEdit && (
                <Card className="border-0 shadow-md lg:col-span-1 order-2">
                  <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" /> Yeni Sınav</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2"><Label className="text-sm">Ders Kodu</Label><Input placeholder="GMI201" value={examCourseCode} onChange={e => setExamCourseCode(e.target.value)} /></div>
                      <div className="space-y-2"><Label className="text-sm">Gözetmen</Label><Select value={examSupervisors} onValueChange={setExamSupervisors}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label className="text-sm">Ders Adı</Label><Input value={examCourseName} onChange={e => setExamCourseName(e.target.value)} /></div>
                    <div className="space-y-2"><Label className="text-sm">Öğr. Üyesi</Label><Input value={examInstructor} onChange={e => setExamInstructor(e.target.value)} /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2"><Label className="text-sm">Tarih</Label><Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} /></div>
                      <div className="space-y-2"><Label className="text-sm">Gün</Label><Select value={examDay} onValueChange={setExamDay}><SelectTrigger><SelectValue placeholder="Gün" /></SelectTrigger><SelectContent>{Object.entries(DAY_NAMES).map(([k, v]) => <SelectItem key={k} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label className="text-sm">Saat</Label><Input placeholder="09:00-11:00" value={examTime} onChange={e => setExamTime(e.target.value)} /></div>
                    <div className="space-y-2"><Label className="text-sm">Notlar</Label><Input value={examNotes} onChange={e => setExamNotes(e.target.value)} /></div>
                    <Button onClick={handleSubmitExam} className="w-full bg-blue-600 hover:bg-blue-700 gap-2"><GraduationCap className="h-4 w-4" /> Ekle</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* SCHEDULE */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Haftalık Program - SOLDA */}
              <Card className="border-0 shadow-md lg:col-span-2 order-1">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-600" /> {canSeeAll ? 'Haftalık Program' : 'Haftalık Programım'}</CardTitle><CardDescription>
                  {canSeeAll ? `${weeklySchedules.length} kayıt` : `${weeklySchedules.filter(s => s.assistantId === currentUser?.id).length} kaydınız var`}
                </CardDescription></CardHeader>
                <CardContent>
                  <Table><TableHeader><TableRow><TableHead>Araş Gör</TableHead><TableHead>Gün</TableHead><TableHead>Saat</TableHead><TableHead>Ders</TableHead>{canEdit && <TableHead className="w-12"></TableHead>}</TableRow></TableHeader>
                    <TableBody>{(canSeeAll ? weeklySchedules : weeklySchedules.filter(s => s.assistantId === currentUser?.id)).sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(s => (
                      <TableRow key={s.id}>
                        <TableCell><span className="text-sm font-medium">{s.assistant.name}</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{DAY_NAMES[s.dayOfWeek]}</Badge></TableCell>
                        <TableCell className="text-sm font-mono">{s.timeSlot}</TableCell>
                        <TableCell className="text-sm">{s.description}</TableCell>
                        {canEdit && <TableCell><Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" aria-label="Programı sil" onClick={() => handleDeleteSchedule(s.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>}
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </CardContent>
              </Card>
              {/* Program Ekle - SAĞDA */}
              <Card className="border-0 shadow-md lg:col-span-1 order-2">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-violet-600" /> Program Ekle</CardTitle><CardDescription>{canEdit ? 'Çakışma kontrolü aktif' : 'Kendi haftalık programınıza ekleyin'}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Araş Gör</Label>
                    <Select value={canEdit ? schedAssistantId : (currentUser?.id || '')} onValueChange={setSchedAssistantId} disabled={!canEdit}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {canEdit ? (
                          arGorAssistants.map(ra => <SelectItem key={ra.id} value={ra.id}>{ra.name}</SelectItem>)
                        ) : (
                          currentUser ? <SelectItem value={currentUser.id}>{currentUser.name} (Kendim)</SelectItem> : null
                        )}
                      </SelectContent>
                    </Select>
                    {!canEdit && <p className="text-[11px] text-slate-500">Sadece kendinize program ekleyebilirsiniz</p>}
                  </div>
                  <div className="space-y-2"><Label className="text-sm">Gün</Label><Select value={schedDay} onValueChange={setSchedDay}><SelectTrigger /><SelectContent>{Object.entries(DAY_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label className="text-sm">Saat</Label><Input placeholder="09:00-12:00" value={schedTime} onChange={e => setSchedTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label className="text-sm">Ders/Açıklama</Label><Input placeholder="GMIM Lisansüstü" value={schedDesc} onChange={e => setSchedDesc(e.target.value)} /></div>
                  <Button onClick={handleAddSchedule} className="w-full bg-violet-600 hover:bg-violet-700 gap-2"><CalendarDays className="h-4 w-4" /> Ekle</Button>
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
                  <Button onClick={handleImport} disabled={!importFile || isImporting} className="w-full bg-orange-700 hover:bg-orange-800 gap-2">
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
            {canEdit && (
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
                      <p className="text-[11px] text-slate-500">Boş bırakılırsa varsayılan: e-posta önek + 2026</p>
                    </div>
                    <Button onClick={handleAddAssistant} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"><Plus className="h-4 w-4" /> Ekle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Yöneticiler (Dekan ve Bölüm Başkanı) - en üstte, sadece yöneticilere görünür */}
            {canSeeAll && managerAssistants.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Yönetim</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {managerAssistants.map(ra => (
                    <Card key={ra.id} className="shadow-md border border-violet-200 bg-gradient-to-br from-violet-50/70 to-blue-50/70">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg ${ra.role === 'dekan' ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-200' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200'}`}>
                            {ra.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold truncate">{ra.name}</h3>
                              <Badge className={`text-[10px] gap-0.5 ${ra.role === 'dekan' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                <Shield className="h-2.5 w-2.5" /> {ra.role === 'dekan' ? roleLabel('dekan', viewDept) : 'Bölüm Başkanı'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{ra.email}</p>
                            <p className="text-[11px] text-slate-500 mt-1">Yönetim seviyesi — kontrol amaçlı erişim</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Araş Gör & Temsilci</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(canSeeAll ? arGorAssistants : arGorAssistants.filter(a => a.id === currentUser?.id)).map(ra => (
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
                        <p className="text-xs font-medium text-slate-500">Daimi Görevler:</p>
                        {(canEdit || currentUser?.id === ra.id) && (
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
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" aria-label="Daimi görevi sil" onClick={() => handleDutyChange(ra.id, 'delete', pd.name, pd.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                        {ra.permanentDuties.length === 0 && <p className="text-xs text-slate-500 italic">Daimi görev yok</p>}
                        {/* Pending changes indicator for this assistant */}
                        {(ra.pendingDutyChanges || []).filter(c => c.status === 'pending').length > 0 && !canEdit && currentUser?.id === ra.id && (
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

                    {canEdit && (
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
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => openResetPasswordDialog(ra.id, ra.name)}>
                              Şifre Sıfırla
                            </Button>
                          </div>
                        </div>
                        {ra.role !== 'admin' && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={async () => {
                              try {
                                const res = await fetch('/api/toggle-role', {
                                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ assistantId: ra.id, requesterId: currentUser?.id }),
                                })
                                const data = await res.json()
                                if (res.ok) { toast.success(data.message); fetchData() }
                                else { toast.error(data.error) }
                              } catch { toast.error('Bağlantı hatası') }
                            }}>
                              <Shield className="h-3 w-3" /> Temsilci Yap
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setRemoveAssistantTarget({ id: ra.id, name: ra.name })}>
                              <Trash2 className="h-3 w-3" /> Kaldır
                            </Button>
                          </div>
                        )}
                        {ra.role === 'admin' && ra.id !== currentUser?.id && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={async () => {
                              try {
                                const res = await fetch('/api/toggle-role', {
                                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ assistantId: ra.id, requesterId: currentUser?.id }),
                                })
                                const data = await res.json()
                                if (res.ok) { toast.success(data.message); fetchData() }
                                else { toast.error(data.error) }
                              } catch { toast.error('Bağlantı hatası') }
                            }}>
                              <Shield className="h-3 w-3" /> Temsilciliği Kaldır
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

      {/* Confirmation dialogs (replace native confirm/prompt — FAZ 1) */}
      {/* Görev silme onayı */}
      <AlertDialog open={!!deleteTaskTarget} onOpenChange={(o) => !o && setDeleteTaskTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-600" /> Görevi Sil?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTaskTarget && (
                <span className="space-y-1 block">
                  <span className="block text-slate-900 font-medium">{deleteTaskTarget.description}</span>
                  <span className="block">{deleteTaskTarget.assistant?.name} · {deleteTaskTarget.points} puan</span>
                  <span className="block">Bu işlem görevi kalıcı olarak siler. Silindikten sonra &quot;Geri Al&quot; ile yeniden oluşturabilirsiniz.</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deleteTaskTarget) performDeleteTask(deleteTaskTarget) }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duyuru silme onayı */}
      <AlertDialog open={!!deleteAnnouncementTarget} onOpenChange={(o) => !o && setDeleteAnnouncementTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-600" /> Duyuruyu Sil?</AlertDialogTitle>
            <AlertDialogDescription>Bu duyuru kalıcı olarak silinecek. Yorumlarıyla birlikte kaldırılır. Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={performDeleteAnnouncement}>
              <Trash2 className="h-4 w-4 mr-1" /> Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kişi kaldırma onayı */}
      <AlertDialog open={!!removeAssistantTarget} onOpenChange={(o) => !o && setRemoveAssistantTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-600" /> Kişiyi Kaldır?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeAssistantTarget && (
                <span className="block"><strong className="text-slate-900">{removeAssistantTarget.name}</strong> adlı kişi sistemden kaldırılacak. Tüm görev ve kayıtları silinecek. Bu işlem geri alınamaz.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={performRemoveAssistant}>
              <Trash2 className="h-4 w-4 mr-1" /> Kalıcı Olarak Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Şifre sıfırlama (prompt yerine Dialog) */}
      <Dialog open={!!resetPasswordTarget} onOpenChange={(o) => { if (!o) { setResetPasswordTarget(null); setResetPasswordValue('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-600" /> Şifre Sıfırla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">{resetPasswordTarget?.name}</strong> için yeni şifre belirleyin (en az 4 karakter).
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-pass-input">Yeni Şifre</Label>
              <Input
                id="reset-pass-input"
                type="text"
                value={resetPasswordValue}
                onChange={e => setResetPasswordValue(e.target.value)}
                placeholder="En az 4 karakter"
                onKeyDown={e => { if (e.key === 'Enter' && resetPasswordValue.length >= 4) performResetPassword() }}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setResetPasswordTarget(null); setResetPasswordValue('') }}>İptal</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1" disabled={resetPasswordValue.length < 4} onClick={performResetPassword}>
                <Check className="h-4 w-4" /> Sıfırla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{deptInfo?.short} Ar.Gör Yönetim Sistemi · İTÜ Denizcilik Fakültesi</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Destekli v3.1</span>
        </div>
      </footer>
    </div>
  )
}
