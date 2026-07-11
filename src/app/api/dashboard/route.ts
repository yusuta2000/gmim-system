import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { PortalSessionUser, SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import type { DashboardData, DashboardExam, DashboardTask } from '@/features/dashboard/types'

const querySchema = z.object({ department: z.enum(['GMIM', 'DUIM']).optional() })

const recentTaskSelect = {
  id: true,
  description: true,
  status: true,
  date: true,
  points: true,
  assistant: { select: { name: true } },
} satisfies Prisma.TaskSelect

const upcomingExamSelect = {
  id: true,
  courseCode: true,
  date: true,
  requiredSupervisors: true,
  supervisors: { select: { assistantId: true } },
} satisfies Prisma.ExamSelect

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'baskan' || user.role === 'dekan'
}

function serializeTasks(tasks: Array<{ id: string; description: string; status: string; date: Date; points: number; assistant: { name: string } }>): DashboardTask[] {
  return tasks.map((task) => ({
    id: task.id,
    description: task.description,
    status: task.status,
    date: task.date.toISOString(),
    points: task.points,
    assistantName: task.assistant.name,
  }))
}

function serializeExams(exams: Array<{ id: string; courseCode: string; date: Date; requiredSupervisors: number; supervisors: Array<{ assistantId: string }> }>): DashboardExam[] {
  return exams.map((exam) => ({
    id: exam.id,
    courseCode: exam.courseCode,
    date: exam.date.toISOString(),
    supervisorGap: Math.max(0, exam.requiredSupervisors - exam.supervisors.length),
  }))
}

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })

    const department = parsed.data.department || user.department
    assertDepartmentAccess(user, department)

    const data = isManager(user)
      ? await managerDashboard(user, department)
      : await assistantDashboard(user, department)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.code }, { status: 403 })
    console.error('Error fetching dashboard', error)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

async function assistantDashboard(user: PortalSessionUser, department: SessionUser['department']): Promise<DashboardData> {
  const assistant = await db.researchAssistant.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, role: true, department: true, totalPoints: true },
  })
  if (!assistant) throw new UnauthenticatedError()

  const [recentTasks, assignedTask, taskCount, rank, upcomingExams] = await Promise.all([
    db.task.findMany({ where: { assistantId: user.id }, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 5, select: recentTaskSelect }),
    db.task.findFirst({ where: { assistantId: user.id, status: 'assigned' }, orderBy: [{ date: 'desc' }, { id: 'desc' }], select: { id: true, description: true, points: true } }),
    db.task.count({ where: { assistantId: user.id } }),
    db.researchAssistant.count({ where: { department, isActive: true, role: { in: ['admin', 'user'] }, totalPoints: { lt: assistant.totalPoints } } }),
    db.exam.findMany({
      where: { department, date: { gte: new Date() }, supervisors: { some: { assistantId: user.id } } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: 3,
      select: upcomingExamSelect,
    }),
  ])

  return {
    kind: 'assistant',
    context: { userName: assistant.name, department, generatedAt: new Date().toISOString() },
    priority: assignedTask ? {
      title: 'Yanıtını bekleyen bir görev var',
      description: `${assignedTask.description} · ${assignedTask.points} puan`,
      href: '/tasks', label: 'Görevi incele', count: 1, tone: 'warning',
    } : {
      title: 'Görev kayıtların güncel',
      description: 'Yeni bir çalışma tamamladığında görev kaydı oluşturabilirsin.',
      href: '/tasks', label: 'Görevleri aç', tone: 'neutral',
    },
    metrics: [
      { label: 'Toplam puan', value: assistant.totalPoints, detail: 'Mevcut dönem' },
      { label: 'Bölüm sırası', value: rank + 1, detail: 'Aktif araştırma görevlileri' },
      { label: 'Görev kaydı', value: taskCount, detail: 'Tüm durumlar' },
    ],
    recentTasks: serializeTasks(recentTasks),
    ranking: [],
    upcomingExams: serializeExams(upcomingExams),
  }
}

async function managerDashboard(user: PortalSessionUser, department: SessionUser['department']): Promise<DashboardData> {
  const [ranking, totalTasks, pendingTasks, recentTasks, upcomingExamRows, pendingDutyChanges] = await Promise.all([
    db.researchAssistant.findMany({
      where: { department, isActive: true, role: { in: ['admin', 'user'] } },
      orderBy: [{ totalPoints: 'desc' }, { order: 'asc' }, { id: 'asc' }],
      take: 5,
      select: { id: true, name: true, totalPoints: true, order: true },
    }),
    db.task.count({ where: { assistant: { department } } }),
    db.task.count({ where: { assistant: { department }, status: 'pending' } }),
    db.task.findMany({ where: { assistant: { department } }, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 5, select: recentTaskSelect }),
    db.exam.findMany({ where: { department, date: { gte: new Date() } }, orderBy: [{ date: 'asc' }, { id: 'asc' }], take: 6, select: upcomingExamSelect }),
    db.pendingDutyChange.count({ where: { assistant: { department }, status: 'pending' } }),
  ])
  const upcomingExams = serializeExams(upcomingExamRows)
  const examsWithGap = upcomingExams.filter((exam) => exam.supervisorGap > 0).length

  const priority = pendingTasks > 0 ? {
    title: 'Görev onayları bekliyor',
    description: `${pendingTasks} görev kaydı incelenmeyi bekliyor.`,
    href: '/management/approvals', label: 'Onayları incele', count: pendingTasks, tone: 'warning' as const,
  } : examsWithGap > 0 ? {
    title: 'Gözetmen ataması eksik',
    description: `${examsWithGap} yaklaşan sınavda gözetmen açığı var.`,
    href: '/exams', label: 'Sınavları aç', count: examsWithGap, tone: 'warning' as const,
  } : {
    title: 'Bekleyen kritik işlem yok',
    description: 'Görev onayları ve yaklaşan sınav atamaları güncel.',
    href: '/tasks', label: 'Görevleri aç', tone: 'neutral' as const,
  }

  return {
    kind: 'manager',
    context: { userName: user.name, department, generatedAt: new Date().toISOString() },
    priority,
    metrics: [
      { label: 'Toplam görev', value: totalTasks, detail: 'Bölüm genelinde' },
      { label: 'Onay bekleyen', value: pendingTasks, detail: 'Görev kaydı' },
      { label: 'Gözetmen açığı', value: examsWithGap, detail: 'Yaklaşan sınav' },
      { label: 'Görev değişikliği', value: pendingDutyChanges, detail: 'Onay bekliyor' },
    ],
    recentTasks: serializeTasks(recentTasks),
    ranking: ranking.map(({ id, name, totalPoints }) => ({ id, name, totalPoints })),
    upcomingExams,
  }
}
