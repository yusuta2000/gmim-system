import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import type { PointCategoryBreakdown, PointDetails, PointPerson, PointsResponse } from '@/features/points/types'

const querySchema = z.object({ department: z.enum(['GMIM', 'DUIM']).optional() })

const pointPersonSelect = {
  id: true, name: true, totalPoints: true, order: true, isActive: true, role: true,
} satisfies Prisma.ResearchAssistantSelect

const taskDetailSelect = {
  assistantId: true, points: true, date: true, category: { select: { name: true } },
} satisfies Prisma.TaskSelect

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'baskan' || user.role === 'dekan'
}

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })

    const department = parsed.data.department || user.department
    assertDepartmentAccess(user, department)
    const canViewDetails = isManager(user)
    const assistants = await db.researchAssistant.findMany({
      where: { department, role: { in: ['admin', 'user'] } },
      orderBy: [{ isActive: 'desc' }, { totalPoints: 'asc' }, { order: 'asc' }, { id: 'asc' }],
      select: pointPersonSelect,
    })

    const details = canViewDetails ? await buildDetails(department) : new Map<string, PointDetails>()
    const people: PointPerson[] = assistants.map((assistant) => ({
      id: assistant.id,
      name: assistant.name,
      totalPoints: assistant.totalPoints,
      isActive: assistant.isActive,
      role: assistant.role as PointPerson['role'],
      isCurrentUser: assistant.id === user.id,
      ...(canViewDetails ? { details: details.get(assistant.id) || emptyDetails() } : {}),
    }))
    const response: PointsResponse = { department, canViewDetails, people }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.code }, { status: 403 })
    console.error('Error fetching points table', error)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

async function buildDetails(department: SessionUser['department']) {
  const tasks = await db.task.findMany({
    where: { assistant: { department }, status: 'approved' },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    select: taskDetailSelect,
  })
  const details = new Map<string, PointDetails>()
  for (const task of tasks) {
    const item = details.get(task.assistantId) || emptyDetails()
    item.approvedTaskCount += 1
    item.approvedPoints += task.points
    item.averagePoints = item.approvedPoints / item.approvedTaskCount
    if (!item.lastTaskDate) item.lastTaskDate = task.date.toISOString()
    const categoryName = task.category?.name || 'Diğer'
    const category = item.categories.find((entry) => entry.name === categoryName)
    if (category) { category.points += task.points; category.count += 1 }
    else item.categories.push({ name: categoryName, points: task.points, count: 1 })
    details.set(task.assistantId, item)
  }
  for (const item of details.values()) item.categories.sort(compareCategories)
  return details
}

function emptyDetails(): PointDetails {
  return { approvedTaskCount: 0, approvedPoints: 0, averagePoints: 0, lastTaskDate: null, categories: [] }
}

function compareCategories(a: PointCategoryBreakdown, b: PointCategoryBreakdown) {
  return b.points - a.points || a.name.localeCompare(b.name, 'tr')
}
