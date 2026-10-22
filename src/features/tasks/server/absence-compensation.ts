import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { TaskServiceError } from './errors'

// A returning colleague gets the lowest points any colleague present for the whole absence earned in that range.
export const ABSENCE_SOURCE = 'absence_compensation'
const RANGE_PATTERN = /\[YURTDISI\] (\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

type Range = { start: string; end: string }

export type AbsenceRow = {
  id: string
  name: string
  points: number
  joinedDuringRange: boolean
  absentDuringRange: boolean
  excluded: boolean
}

function parseRange(notes: string | null): Range | null {
  const match = notes?.match(RANGE_PATTERN)
  return match ? { start: match[1], end: match[2] } : null
}

function overlaps(a: Range | null, b: Range) {
  return a !== null && a.start <= b.end && b.start <= a.end
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('tr-TR', { timeZone: 'UTC' })
}

export async function calculateAbsenceCompensation(
  input: { actor: SessionUser; assistantId: string; start: string; end: string; excludedIds?: string[] },
  client: Prisma.TransactionClient = db,
) {
  const range = { start: input.start, end: input.end }
  if (!DATE_PATTERN.test(range.start) || !DATE_PATTERN.test(range.end) || range.start > range.end) {
    throw new TaskServiceError('BAD_REQUEST', 'Geçerli bir gidiş ve dönüş tarihi seçin')
  }

  const assistant = await client.researchAssistant.findUnique({ where: { id: input.assistantId } })
  if (!assistant) throw new TaskServiceError('NOT_FOUND', 'Kullanıcı bulunamadı')
  assertDepartmentAccess(input.actor, assistant.department as SessionUser['department'])
  if (!['user', 'admin'].includes(assistant.role)) {
    throw new TaskServiceError('BAD_REQUEST', 'Telafi puanı yalnız araştırma görevlilerine eklenir')
  }

  const startDate = new Date(`${range.start}T00:00:00.000Z`)
  const endExclusive = new Date(new Date(`${range.end}T00:00:00.000Z`).getTime() + DAY_MS)
  const colleagues = await client.researchAssistant.findMany({
    where: { department: assistant.department, isActive: true, role: { in: ['user', 'admin'] }, id: { not: assistant.id } },
    select: { id: true, name: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  const ids = colleagues.map((colleague) => colleague.id)
  const [sums, absences] = await Promise.all([
    client.task.groupBy({
      by: ['assistantId'],
      where: { assistantId: { in: ids }, status: 'approved', source: { not: ABSENCE_SOURCE }, date: { gte: startDate, lt: endExclusive } },
      _sum: { points: true },
    }),
    client.task.findMany({
      where: { source: ABSENCE_SOURCE, assistantId: { in: [...ids, assistant.id] } },
      select: { assistantId: true, notes: true },
    }),
  ])

  const absentIds = new Set(absences.filter((task) => overlaps(parseRange(task.notes), range)).map((task) => task.assistantId))
  const rows: AbsenceRow[] = colleagues.map((colleague) => {
    const joinedDuringRange = colleague.createdAt > startDate
    const absentDuringRange = absentIds.has(colleague.id)
    return {
      id: colleague.id,
      name: colleague.name,
      points: sums.find((sum) => sum.assistantId === colleague.id)?._sum.points ?? 0,
      joinedDuringRange,
      absentDuringRange,
      excluded: input.excludedIds ? input.excludedIds.includes(colleague.id) : joinedDuringRange || absentDuringRange,
    }
  })
  const minimum = rows.filter((row) => !row.excluded).reduce<AbsenceRow | null>((min, row) => (!min || row.points < min.points ? row : min), null)

  return {
    assistant: { id: assistant.id, name: assistant.name },
    ...range,
    rows,
    minimum: minimum ? { id: minimum.id, name: minimum.name, points: minimum.points } : null,
    alreadyCompensated: absentIds.has(assistant.id),
  }
}

export async function addAbsenceCompensation(input: {
  actor: SessionUser
  assistantId: string
  start: string
  end: string
  excludedIds: string[]
  expectedPoints: number
}) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.assistantId}))`
    const result = await calculateAbsenceCompensation(input, tx)
    if (result.alreadyCompensated) {
      throw new TaskServiceError('CONFLICT', 'Bu tarih aralığı için zaten telafi puanı eklenmiş')
    }
    if (!result.minimum) {
      throw new TaskServiceError('BAD_REQUEST', 'Karşılaştırılacak araştırma görevlisi kalmadı')
    }
    if (result.minimum.points !== input.expectedPoints) {
      throw new TaskServiceError('CONFLICT', 'Puanlar önizlemeden sonra değişti; lütfen yeniden hesaplayın')
    }

    const maxTask = await tx.task.findFirst({
      where: { assistantId: result.assistant.id },
      orderBy: { number: 'desc' },
      select: { number: true },
    })
    const description = `Yurtdışı dönüşü telafi puanı (${formatDate(result.start)} – ${formatDate(result.end)})`
    const task = await tx.task.create({
      data: {
        number: (maxTask?.number || 0) + 1,
        description,
        date: new Date(`${result.end}T00:00:00.000Z`),
        points: result.minimum.points,
        status: 'approved',
        source: ABSENCE_SOURCE,
        assignedBy: input.actor.id,
        notes: `En düşük puan: ${result.minimum.name}\n[YURTDISI] ${result.start}..${result.end}`,
        assistantId: result.assistant.id,
      },
    })
    if (result.minimum.points > 0) {
      await tx.researchAssistant.update({
        where: { id: result.assistant.id },
        data: { totalPoints: { increment: result.minimum.points } },
      })
    }
    await tx.notification.create({
      data: {
        title: 'Yurtdışı Telafi Puanı',
        message: `${description}: ${result.minimum.points} puan eklendi.`,
        type: 'success',
        assistantId: result.assistant.id,
        relatedId: task.id,
      },
    })
    return task
  })
}
