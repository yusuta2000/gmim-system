import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { departmentSchema } from '@/features/calendar/schemas'
import { PeriodServiceError, periodErrorStatus, resetPeriod } from '@/features/periods/server/period-service'

const requestSchema = z.object({
  action: z.enum(['reset', 'archive']),
  department: departmentSchema.optional(),
  confirmation: z.string(),
  currentPassword: z.string().min(1),
  carryOverPoints: z.record(z.string(), z.number().finite()).optional(),
})

function isMissingPeriodStorage(error: unknown) {
  const candidate = error as { code?: string; message?: string }
  return candidate?.code === 'P2021' || candidate?.code === 'P2022' || /AcademicPeriod|does not exist|column .* does not exist/i.test(candidate?.message ?? '')
}

async function legacyResetPeriod(input: {
  action: 'reset' | 'archive'
  department: SessionUser['department']
  requester: SessionUser
  carryOverPoints?: Record<string, number>
}) {
  return db.$transaction(async (tx) => {
    let affected = 0
    if (input.action === 'reset') {
      const result = await tx.researchAssistant.updateMany({ where: { department: input.department }, data: { totalPoints: 0 } })
      affected = result.count
    } else {
      for (const [assistantId, points] of Object.entries(input.carryOverPoints ?? {})) {
        const result = await tx.researchAssistant.updateMany({ where: { id: assistantId, department: input.department }, data: { totalPoints: points } })
        affected += result.count
      }
    }
    await tx.importLog.create({
      data: {
        fileName: `period:${input.department}:${input.action}:${input.requester.id}`,
        fileType: 'audit',
        recordCount: affected,
        status: 'completed',
        error: JSON.stringify({ action: input.action, department: input.department, requesterId: input.requester.id, affected, storage: 'legacy' }),
      },
    })
    return { action: input.action }
  })
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const raw = await request.json()
    const department = departmentSchema.parse(raw.department || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)
    const body = requestSchema.parse(raw)
    const expectedConfirmation = `${department} ${body.action === 'reset' ? 'SIFIRLA' : 'TAŞI'}`
    if (body.confirmation.trim().toLocaleUpperCase('tr-TR') !== expectedConfirmation) {
      return NextResponse.json({ error: 'CONFIRMATION_MISMATCH', message: `Onay alanına ${expectedConfirmation} yazın` }, { status: 400 })
    }
    const requester = await db.researchAssistant.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
    if (!requester?.passwordHash || !(await verifyPassword(requester.passwordHash, body.currentPassword))) {
      return NextResponse.json({ error: 'REAUTH_FAILED', message: 'Mevcut parola doğrulanamadı' }, { status: 401 })
    }
    try {
      await resetPeriod({ action: body.action, department, requester: user, carryOverPoints: body.carryOverPoints })
    } catch (error) {
      if (!isMissingPeriodStorage(error)) throw error
      await legacyResetPeriod({ action: body.action, department, requester: user, carryOverPoints: body.carryOverPoints })
    }
    return NextResponse.json({
      message: body.action === 'reset' ? `${department} puanları sıfırlandı ve işlem günlüğe yazıldı` : `${department} puanları taşındı ve işlem günlüğe yazıldı`,
      action: body.action,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.code }, { status: 403 })
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'BAD_REQUEST', issues: error.issues }, { status: 400 })
    if (error instanceof PeriodServiceError) return NextResponse.json({ error: error.code, message: error.message }, { status: periodErrorStatus(error) })
    console.error('Dönem işlemi tamamlanamadı:', error)
    return NextResponse.json({ error: 'Dönem işlemi tamamlanamadı' }, { status: 500 })
  }
}
