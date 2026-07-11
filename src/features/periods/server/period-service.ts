import type { AcademicPeriod, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'

export class PeriodServiceError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'BAD_REQUEST',
    message: string,
  ) {
    super(message)
    this.name = 'PeriodServiceError'
  }
}

export function periodErrorStatus(error: PeriodServiceError) {
  if (error.code === 'NOT_FOUND') return 404
  if (error.code === 'CONFLICT') return 409
  return 400
}

type PeriodClient = Pick<Prisma.TransactionClient, 'academicPeriod'>

export async function assertPeriodAllowsMutation(
  periodId: string | null | undefined,
  client: PeriodClient = db,
) {
  if (!periodId) return
  const period = await client.academicPeriod.findUnique({ where: { id: periodId } })
  if (!period) {
    throw new PeriodServiceError('NOT_FOUND', 'Dönem bulunamadı')
  }
  if (period.status === 'closed') {
    throw new PeriodServiceError('CONFLICT', 'Kapalı dönemde görev değişikliği yapılamaz')
  }
}

export async function getOpenPeriod(input: {
  department: SessionUser['department']
  date?: Date
}) {
  const date = input.date ?? new Date()
  return db.academicPeriod.findFirst({
    where: {
      department: input.department,
      status: 'open',
      startsAt: { lte: date },
      OR: [{ endsAt: null }, { endsAt: { gte: date } }],
    },
    orderBy: { startsAt: 'desc' },
  })
}

export async function resetPeriod(input: {
  action: 'reset' | 'archive'
  department: SessionUser['department']
  requester: SessionUser
  carryOverPoints?: Record<string, number>
}) {
  assertDepartmentAccess(input.requester, input.department)

  return db.$transaction(async (tx) => {
    const current = await tx.academicPeriod.findFirst({
      where: { department: input.department, status: 'open' },
      orderBy: { startsAt: 'desc' },
    })

    if (current) {
      await tx.academicPeriod.update({
        where: { id: current.id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          closedById: input.requester.id,
          endsAt: current.endsAt ?? new Date(),
        },
      })
    }

    const nextPeriodName = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const nextPeriod = await tx.academicPeriod.create({
      data: {
        name: `${input.department}-${nextPeriodName}`,
        department: input.department,
        startsAt: new Date(),
        status: 'open',
      },
    })

    if (input.action === 'reset') {
      await tx.researchAssistant.updateMany({
        where: { department: input.department },
        data: { totalPoints: 0 },
      })
      return { action: input.action, period: nextPeriod }
    }

    if (input.carryOverPoints && typeof input.carryOverPoints === 'object') {
      await Promise.all(Object.entries(input.carryOverPoints).map(([assistantId, points]) => (
        tx.researchAssistant.updateMany({
          where: { id: assistantId, department: input.department },
          data: { totalPoints: points },
        })
      )))
    }
    return { action: input.action, period: nextPeriod }
  })
}

export function summarizePeriodMapping(tasks: Array<{ id: string; date: Date }>, periods: AcademicPeriod[]) {
  return tasks.map((task) => {
    const period = periods.find((candidate) => (
      candidate.startsAt <= task.date && (!candidate.endsAt || candidate.endsAt >= task.date)
    ))
    return {
      taskId: task.id,
      date: task.date.toISOString(),
      periodId: period?.id ?? null,
      periodName: period?.name ?? null,
    }
  })
}
