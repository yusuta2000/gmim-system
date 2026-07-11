import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { departmentSchema } from '@/features/calendar/schemas'

const personSelect = {
  id: true,
  name: true,
  email: true,
  faculty: true,
  department: true,
  role: true,
  isActive: true,
  permanentDuties: { orderBy: { order: 'asc' as const }, select: { id: true, name: true, description: true } },
} as const

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])
    const { searchParams } = new URL(request.url)
    const department = departmentSchema.parse(searchParams.get('department') || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)
    const select = searchParams.get('mode') === 'options'
      ? { id: true, name: true, role: true, isActive: true } as const
      : personSelect
    const people = await db.researchAssistant.findMany({
      where: { OR: [{ department }, { role: 'dekan' }] },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select,
    })
    return NextResponse.json(people)
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.code }, { status: 403 })
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'BAD_REQUEST', issues: error.issues }, { status: 400 })
    console.error('Personel alınamadı:', error)
    return NextResponse.json({ error: 'Personel alınamadı' }, { status: 500 })
  }
}
