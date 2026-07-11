import { NextResponse } from 'next/server'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import { ImportParseError } from '@/features/import-export/server/parser'
import { importTypeSchema } from '@/features/import-export/server/schemas'
import { ImportServiceError, commitImport, importErrorStatus, previewImport } from '@/features/import-export/server/import-service'

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const importType = importTypeSchema.parse((formData.get('type') as string) || 'tasks')
    const mode = ((formData.get('mode') as string) || 'commit') as 'preview' | 'commit'
    const department = ((formData.get('department') as string) || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)

    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (mode === 'preview') {
      const preview = await previewImport({ fileName: file.name, buffer, importType, department })
      return NextResponse.json(preview)
    }

    const result = await commitImport({ fileName: file.name, buffer, importType, department, createdBy: user })
    return NextResponse.json({
      message: result.duplicate
        ? 'Bu dosya daha önce içe aktarılmış; yeni kayıt oluşturulmadı'
        : `${result.imported} kayıt başarıyla içe aktarıldı`,
      imported: result.imported,
      duplicate: result.duplicate,
      importBatchId: result.batch.id,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }
    if (error instanceof ImportParseError) {
      return NextResponse.json({ error: error.code, message: error.message, warnings: error.warnings }, { status: 400 })
    }
    if (error instanceof ImportServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: importErrorStatus(error) })
    }

    console.error('Error importing file:', error)
    return NextResponse.json({ error: 'Dosya içe aktarma hatası: ' + String(error) }, { status: 500 })
  }
}
