import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { createTaskSchema, taskListQuerySchema } from '@/features/tasks/schemas'
import { createTask } from '@/features/tasks/server/task-service'
import { TaskServiceError, taskErrorStatus } from '@/features/tasks/server/errors'
import { splitTaskNotes } from '@/features/tasks/task-notes'

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'dekan' || user.role === 'baskan'
}

const taskListSelect = {
  id: true,
  number: true,
  description: true,
  hoursWorked: true,
  date: true,
  points: true,
  status: true,
  source: true,
  notes: true,
  assistantId: true,
  categoryId: true,
  createdAt: true,
  assistant: {
    select: { id: true, name: true, department: true, totalPoints: true, isActive: true },
  },
  category: {
    select: { id: true, name: true, points: true },
  },
} satisfies Prisma.TaskSelect

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    const { searchParams } = new URL(request.url)
    const parsed = taskListQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const query = parsed.data
    const department = query.department || user.department
    assertDepartmentAccess(user, department)
    const manager = isManager(user)
    const where: Prisma.TaskWhereInput = {
      ...(manager ? { assistant: { department } } : { assistantId: user.id }),
      ...(manager && query.assistantId ? { assistantId: query.assistantId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.dateFrom || query.dateTo ? {
        date: {
          ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
          ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
        },
      } : {}),
    }

    const [items, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: taskListSelect,
      }),
      db.task.count({ where }),
    ])

    return NextResponse.json({
      items: items.map((item) => ({ ...item, ...splitTaskNotes(item.notes) })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    })
  } catch (error) {
    return taskRouteError(error, 'Error fetching tasks')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    const parsed = createTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', issues: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const task = await createTask({ actor: user, data: parsed.data })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return taskRouteError(error, 'Error creating task')
  }
}

function taskRouteError(error: unknown, logMessage: string) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: 403 })
  }
  if (error instanceof TaskServiceError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: taskErrorStatus(error) })
  }
  console.error(logMessage, error)
  return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
}
