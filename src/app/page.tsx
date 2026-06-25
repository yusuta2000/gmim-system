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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Users, ListChecks, GraduationCap, Brain, BarChart3, Plus, CheckCircle2,
  Clock, AlertCircle, UserCheck, Award, TrendingDown, Zap, Ship,
  CalendarDays, ChevronRight, Sparkles, Send, ArrowUpRight, Target
} from 'lucide-react'

// Types
interface ResearchAssistant {
  id: string
  name: string
  email: string
  phone: string | null
  faculty: string
  department: string
  totalPoints: number
  order: number
  isActive: boolean
  tasks: Task[]
  permanentDuties: PermanentDuty[]
}

interface Task {
  id: string
  number: number
  description: string
  hoursWorked: string | null
  date: string
  points: number
  status: string
  source: string
  notes: string | null
  assistantId: string
  categoryId: string | null
  assistant?: ResearchAssistant
  category?: PointCategory
}

interface PointCategory {
  id: string
  name: string
  points: number
  description: string | null
  isActive: boolean
}

interface Exam {
  id: string
  courseCode: string
  courseName: string
  instructor: string
  date: string
  day: string
  timeSlot: string
  classroom: string | null
  requiredSupervisors: number
  notes: string | null
  supervisors: ExamSupervisor[]
}

interface ExamSupervisor {
  id: string
  examId: string
  assistantId: string
  assistant: ResearchAssistant
}

interface AIClassifyResult {
  matched: boolean
  category: PointCategory | null
  confidence: number
  suggestedPoints: number
  message?: string
  allCategories: { id: string; name: string; points: number }[]
}

export default function Home() {
  const [assistants, setAssistants] = useState<ResearchAssistant[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<PointCategory[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Task form state
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskHours, setTaskHours] = useState('')
  const [taskAssistantId, setTaskAssistantId] = useState('')
  const [taskCategoryId, setTaskCategoryId] = useState('')
  const [taskPoints, setTaskPoints] = useState(0)
  const [taskNotes, setTaskNotes] = useState('')
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyResult, setClassifyResult] = useState<AIClassifyResult | null>(null)

  // Exam form state
  const [examCourseCode, setExamCourseCode] = useState('')
  const [examCourseName, setExamCourseName] = useState('')
  const [examInstructor, setExamInstructor] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examDay, setExamDay] = useState('')
  const [examTime, setExamTime] = useState('')
  const [examSupervisors, setExamSupervisors] = useState('1')
  const [examNotes, setExamNotes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [assRes, taskRes, catRes, examRes] = await Promise.all([
        fetch('/api/assistants'),
        fetch('/api/tasks'),
        fetch('/api/categories'),
        fetch('/api/exams'),
      ])
      const assData = await assRes.json()
      const taskData = await taskRes.json()
      const catData = await catRes.json()
      const examData = await examRes.json()

      setAssistants(assData)
      setTasks(taskData)
      setCategories(catData)
      setExams(examData)
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // AI Classify task
  const handleClassifyTask = async () => {
    if (!taskDesc.trim()) {
      toast.error('Lütfen görev açıklaması girin')
      return
    }
    setIsClassifying(true)
    try {
      const res = await fetch('/api/ai-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDescription: taskDesc }),
      })
      const data: AIClassifyResult = await res.json()
      setClassifyResult(data)
      if (data.matched) {
        setTaskCategoryId(data.category?.id || '')
        setTaskPoints(data.suggestedPoints)
        toast.success(`AI Eşleşme: ${data.category?.name} (${data.suggestedPoints} puan)`, {
          description: `Güven: %${Math.round(data.confidence * 100)}`
        })
      } else {
        toast.info('Otomatik eşleşme bulunamadı. Lütfen kategoriyi manuel seçin.')
      }
    } catch {
      toast.error('AI sınıflandırma hatası')
    } finally {
      setIsClassifying(false)
    }
  }

  // Submit new task
  const handleSubmitTask = async () => {
    if (!taskDesc || !taskDate || !taskAssistantId) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: taskDesc,
          date: taskDate,
          hoursWorked: taskHours || null,
          assistantId: taskAssistantId,
          categoryId: taskCategoryId || null,
          points: taskPoints,
          source: 'external',
          notes: taskNotes || null,
        }),
      })
      if (res.ok) {
        toast.success('Görev başarıyla eklendi!')
        // Reset form
        setTaskDesc('')
        setTaskDate('')
        setTaskHours('')
        setTaskAssistantId('')
        setTaskCategoryId('')
        setTaskPoints(0)
        setTaskNotes('')
        setClassifyResult(null)
        fetchData()
      } else {
        toast.error('Görev eklenirken hata oluştu')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  // Submit new exam
  const handleSubmitExam = async () => {
    if (!examCourseCode || !examCourseName || !examDate || !examDay || !examTime) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: examCourseCode,
          courseName: examCourseName,
          instructor: examInstructor,
          date: examDate,
          day: examDay,
          timeSlot: examTime,
          requiredSupervisors: parseInt(examSupervisors),
          notes: examNotes || null,
        }),
      })
      if (res.ok) {
        toast.success('Sınav başarıyla eklendi!')
        setExamCourseCode('')
        setExamCourseName('')
        setExamInstructor('')
        setExamDate('')
        setExamDay('')
        setExamTime('')
        setExamSupervisors('1')
        setExamNotes('')
        fetchData()
      } else {
        toast.error('Sınav eklenirken hata oluştu')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  // Auto-assign supervisors
  const handleAutoAssign = async (examId: string) => {
    try {
      const res = await fetch('/api/supervisor-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message, {
          description: data.assignments?.map((a: ExamSupervisor) => a.assistant.name).join(', ')
        })
        fetchData()
      } else {
        toast.error('Gözetmen atama hatası')
      }
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  // Stats
  const totalTasks = tasks.length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const maxPoints = Math.max(...assistants.map(a => a.totalPoints), 1)
  const minPointsAssistant = assistants.length > 0 ? [...assistants].sort((a, b) => a.totalPoints - b.totalPoints)[0] : null
  const unassignedExams = exams.filter(e => e.supervisors.length < e.requiredSupervisors).length

  // Sort by points ascending for display
  const sortedByPoints = [...assistants].sort((a, b) => a.totalPoints - b.totalPoints)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-600 font-medium">GMIM Sistemi Yükleniyor...</p>
        </div>
      </div>
    )
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
              <p className="text-xs text-slate-500">İTÜ Denizcilik Fakültesi · Gemi Makineleri İşletme Müh.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              AI Destekli
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1">
              <Brain className="h-3 w-3" />
              {categories.length} Kategori
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl h-auto">
            <TabsTrigger value="dashboard" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
              <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Puan Tablosu</span>
              <span className="sm:hidden">Puan</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
              <ListChecks className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Görevler</span>
              <span className="sm:hidden">Görev</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
              <GraduationCap className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sınavlar</span>
              <span className="sm:hidden">Sınav</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
              <Award className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Puan Baremi</span>
              <span className="sm:hidden">Barem</span>
            </TabsTrigger>
            <TabsTrigger value="personnel" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Personel</span>
              <span className="sm:hidden">Kişiler</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== DASHBOARD TAB ===== */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Toplam Ar.Gör</p>
                      <p className="text-2xl font-bold text-emerald-900">{assistants.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-emerald-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Bekleyen Görev</p>
                      <p className="text-2xl font-bold text-amber-900">{pendingTasks}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Toplam Görev</p>
                      <p className="text-2xl font-bold text-blue-900">{totalTasks}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <ListChecks className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-rose-50 to-rose-100/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-rose-700 font-medium">Gözetmen Bekleyen</p>
                      <p className="text-2xl font-bold text-rose-900">{unassignedExams}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-rose-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Point Ranking */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-emerald-600" />
                      Puan Sıralaması
                    </CardTitle>
                    <CardDescription>En az puanlı araş gör görev önceliğine sahiptir</CardDescription>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1">
                    <Target className="h-3 w-3" />
                    Öncelik: Düşük Puan
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedByPoints.map((ra, idx) => (
                    <div key={ra.id} className={`flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-slate-50 ${idx === 0 ? 'bg-emerald-50 border border-emerald-200' : ''}`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-emerald-500 text-white' :
                        idx === 1 ? 'bg-amber-500 text-white' :
                        idx === 2 ? 'bg-orange-400 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">{ra.name}</span>
                          {idx === 0 && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5">
                              <Zap className="h-2.5 w-2.5" /> ÖNCELİKLİ
                            </Badge>
                          )}
                        </div>
                        <Progress value={(ra.totalPoints / maxPoints) * 100} className="h-2 mt-1.5" />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-bold text-slate-900">{ra.totalPoints}</span>
                        <span className="text-xs text-slate-500 ml-1">puan</span>
                      </div>
                    </div>
                  ))}
                </div>
                {minPointsAssistant && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        {minPointsAssistant.name} en az puana sahip
                      </p>
                      <p className="text-xs text-emerald-600">Yeni görevler öncelikli olarak bu araş görle paylaşılmalıdır</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    Yaklaşan Sınavlar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exams.slice(0, 4).map(exam => (
                      <div key={exam.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{exam.courseCode} - {exam.courseName}</p>
                          <p className="text-xs text-slate-500">{exam.day} · {exam.timeSlot}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={exam.supervisors.length >= exam.requiredSupervisors ? "default" : "destructive"} className="text-[10px]">
                            {exam.supervisors.length}/{exam.requiredSupervisors} Gözetmen
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-amber-600" />
                    Son Görevler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.description}</p>
                          <p className="text-xs text-slate-500">{task.assistant?.name || '—'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-2">
                          +{task.points} p
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== TASKS TAB ===== */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Task Form */}
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-emerald-600" />
                    Yeni Görev Ekle
                  </CardTitle>
                  <CardDescription>AI destekli görev girişi ve puanlama</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskDesc" className="text-sm font-medium">Görev Açıklaması</Label>
                    <div className="flex gap-2">
                      <Textarea
                        id="taskDesc"
                        placeholder="Örn: MÜDEK toplantısına 3 saat katıldım"
                        value={taskDesc}
                        onChange={e => setTaskDesc(e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="flex-shrink-0 h-auto border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"
                        onClick={handleClassifyTask}
                        disabled={isClassifying || !taskDesc.trim()}
                      >
                        {isClassifying ? (
                          <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      AI otomatik kategori eşleştirme için butona tıklayın
                    </p>
                  </div>

                  {classifyResult && (
                    <div className={`p-3 rounded-xl text-sm ${classifyResult.matched ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                      {classifyResult.matched ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-emerald-800 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Eşleşme: {classifyResult.category?.name}
                          </p>
                          <p className="text-xs text-emerald-600">Önerilen Puan: {classifyResult.suggestedPoints} | Güven: %{Math.round(classifyResult.confidence * 100)}</p>
                        </div>
                      ) : (
                        <p className="text-amber-800 text-xs">{classifyResult.message}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Araş Gör</Label>
                    <Select value={taskAssistantId} onValueChange={setTaskAssistantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Araş gör seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedByPoints.map(ra => (
                          <SelectItem key={ra.id} value={ra.id}>
                            <span className="flex items-center gap-2">
                              {ra.name}
                              <span className="text-xs text-slate-400">({ra.totalPoints}p)</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Kategori</Label>
                    <Select value={taskCategoryId} onValueChange={v => {
                      setTaskCategoryId(v)
                      const cat = categories.find(c => c.id === v)
                      if (cat) setTaskPoints(cat.points)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.points} puan)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tarih</Label>
                      <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Saat</Label>
                      <Input placeholder="09:00-12:00" value={taskHours} onChange={e => setTaskHours(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Puan</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" value={taskPoints} onChange={e => setTaskPoints(parseInt(e.target.value) || 0)} className="w-24" />
                      {classifyResult?.matched && (
                        <Badge className="bg-emerald-100 text-emerald-700 gap-1 text-xs">
                          <Sparkles className="h-3 w-3" /> AI Önerisi
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notlar</Label>
                    <Input placeholder="Opsiyonel" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} />
                  </div>

                  <Button onClick={handleSubmitTask} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Send className="h-4 w-4" />
                    Görevi Ekle
                  </Button>
                </CardContent>
              </Card>

              {/* Task List */}
              <Card className="border-0 shadow-md lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-slate-700" />
                    Tüm Görevler
                  </CardTitle>
                  <CardDescription>{tasks.length} görev kayıtlı</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Araş Gör</TableHead>
                          <TableHead>Görev</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead className="text-right">Puan</TableHead>
                          <TableHead>Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell className="font-mono text-xs text-slate-400">{task.number}</TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{task.assistant?.name || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{task.description}</span>
                              {task.category && (
                                <Badge variant="outline" className="ml-2 text-[10px]">{task.category.name}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(task.date).toLocaleDateString('tr-TR')}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{task.points}</TableCell>
                            <TableCell>
                              <Badge
                                variant={task.status === 'approved' ? 'default' : task.status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-[10px]"
                              >
                                {task.status === 'approved' ? 'Onaylı' : task.status === 'pending' ? 'Bekliyor' : 'Reddedildi'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== EXAMS TAB ===== */}
          <TabsContent value="exams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Exam Form */}
              <Card className="border-0 shadow-md lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Yeni Sınav Ekle
                  </CardTitle>
                  <CardDescription>Sınav takvimi ve gözetmen atama</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ders Kodu</Label>
                      <Input placeholder="GMI201" value={examCourseCode} onChange={e => setExamCourseCode(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gözetmen Sayısı</Label>
                      <Select value={examSupervisors} onValueChange={setExamSupervisors}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Gözetmen</SelectItem>
                          <SelectItem value="2">2 Gözetmen</SelectItem>
                          <SelectItem value="3">3 Gözetmen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ders Adı</Label>
                    <Input placeholder="Gemi Makineleri" value={examCourseName} onChange={e => setExamCourseName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Öğretim Üyesi</Label>
                    <Input placeholder="Prof. Dr. ..." value={examInstructor} onChange={e => setExamInstructor(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tarih</Label>
                      <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gün</Label>
                      <Select value={examDay} onValueChange={setExamDay}>
                        <SelectTrigger>
                          <SelectValue placeholder="Gün" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pazartesi">Pazartesi</SelectItem>
                          <SelectItem value="Salı">Salı</SelectItem>
                          <SelectItem value="Çarşamba">Çarşamba</SelectItem>
                          <SelectItem value="Perşembe">Perşembe</SelectItem>
                          <SelectItem value="Cuma">Cuma</SelectItem>
                          <SelectItem value="Cumartesi">Cumartesi</SelectItem>
                          <SelectItem value="Pazar">Pazar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Saat</Label>
                    <Input placeholder="09:00-11:00" value={examTime} onChange={e => setExamTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notlar</Label>
                    <Input placeholder="Opsiyonel" value={examNotes} onChange={e => setExamNotes(e.target.value)} />
                  </div>
                  <Button onClick={handleSubmitExam} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Sınavı Ekle
                  </Button>
                </CardContent>
              </Card>

              {/* Exam List */}
              <Card className="border-0 shadow-md lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    Sınav Listesi ve Gözetmen Atama
                  </CardTitle>
                  <CardDescription>
                    {exams.length} sınav · {unassignedExams} gözetmen bekliyor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {exams.map(exam => (
                        <div key={exam.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{exam.courseCode}</span>
                                <ChevronRight className="h-3 w-3 text-slate-300" />
                                <span className="text-sm text-slate-700">{exam.courseName}</span>
                              </div>
                              <p className="text-xs text-slate-500">{exam.instructor}</p>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {exam.day} · {new Date(exam.date).toLocaleDateString('tr-TR')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {exam.timeSlot}
                                </span>
                              </div>
                              {exam.notes && (
                                <p className="text-xs text-amber-600 mt-1">Not: {exam.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <Badge variant={exam.supervisors.length >= exam.requiredSupervisors ? "default" : "destructive"} className="gap-1">
                                <UserCheck className="h-3 w-3" />
                                {exam.supervisors.length}/{exam.requiredSupervisors}
                              </Badge>
                              {exam.supervisors.length < exam.requiredSupervisors && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleAutoAssign(exam.id)}
                                >
                                  <Zap className="h-3 w-3" />
                                  Otomatik Ata
                                </Button>
                              )}
                            </div>
                          </div>
                          {exam.supervisors.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-xs text-slate-400 mb-2">Atanan Gözetmenler:</p>
                              <div className="flex flex-wrap gap-2">
                                {exam.supervisors.map(s => (
                                  <Badge key={s.id} variant="secondary" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    {s.assistant.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== CATEGORIES TAB ===== */}
          <TabsContent value="categories" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  Puan Baremi
                </CardTitle>
                <CardDescription>Görev kategorileri ve puan değerleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all group">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900 text-sm group-hover:text-amber-900 transition-colors">{cat.name}</h4>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold">
                          {cat.points} p
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PERSONNEL TAB ===== */}
          <TabsContent value="personnel" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistants.map(ra => (
                <Card key={ra.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-emerald-200">
                        {ra.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{ra.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{ra.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-xs">{ra.faculty} - {ra.department}</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">{ra.totalPoints} puan</Badge>
                        </div>
                      </div>
                    </div>
                    {ra.permanentDuties.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-400 mb-2">Daimi Görevler:</p>
                        <div className="space-y-1">
                          {ra.permanentDuties.map(pd => (
                            <div key={pd.id} className="flex items-center gap-2 text-xs text-slate-600">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
                              <span>{pd.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ra.tasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-400 mb-2">Son Görevler:</p>
                        <div className="space-y-1">
                          {ra.tasks.slice(0, 3).map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 truncate flex-1">{t.description}</span>
                              <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">+{t.points}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-slate-400">
          <span>GMIM Ar.Gör Yönetim Sistemi · İTÜ Denizcilik Fakültesi</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI Destekli Prototip
          </span>
        </div>
      </footer>
    </div>
  )
}
