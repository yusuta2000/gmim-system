import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { addAbsenceCompensation, calculateAbsenceCompensation } from '@/features/tasks/server/absence-compensation'
import { TaskServiceError, taskErrorStatus } from '@/features/tasks/server/errors'

const commitSchema = z.object({
  assistantId: z.string().min(1),
  start: z.string(),
  end: z.string(),
  excludedIds: z.array(z.string()),
  expectedPoints: z.number().int(),
})

function errorResponse(error: unknown) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: 403 })
  }
  if (error instanceof TaskServiceError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: taskErrorStatus(error) })
  }
  console.error('Error in absence compensation:', error)
  return NextResponse.json({ error: 'İşlem hatası' }, { status: 500 })
}

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const { searchParams } = new URL(request.url)
    const excluded = searchParams.get('excluded')

    return NextResponse.json(await calculateAbsenceCompensation({
      actor: user,
      assistantId: searchParams.get('assistantId') ?? '',
      start: searchParams.get('start') ?? '',
      end: searchParams.get('end') ?? '',
      excludedIds: excluded === null ? undefined : excluded.split(',').filter(Boolean),
    }))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const parsed = commitSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Eksik veya hatalı bilgi' }, { status: 400 })
    }

    const task = await addAbsenceCompensation({ actor: user, ...parsed.data })
    return NextResponse.json({ task, message: 'Telafi puanı eklendi' }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
