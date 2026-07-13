import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { AuthorizationError } from '@/lib/authorization/errors'
import { requireRole } from '@/lib/authorization/roles'
import {
  commitWorkbookSync,
  previewWorkbookSync,
  WorkbookSyncError,
  workbookSyncErrorStatus,
} from '@/features/import-export/server/workbook-sync'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    requireRole(user, ['admin', 'dekan', 'baskan'])

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mode = formData.get('mode') as string | null
    const previewHash = formData.get('previewHash') as string | null
    const department = ((formData.get('department') as string) || user.department) as SessionUser['department']
    assertDepartmentAccess(user, department)

    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 400 })
    }
    if (mode !== 'preview' && mode !== 'commit') {
      return NextResponse.json({ error: 'PREVIEW_REQUIRED', message: 'Önce dosya önizlemesi oluşturun' }, { status: 400 })
    }
    if (mode === 'commit' && !previewHash) {
      return NextResponse.json({ error: 'PREVIEW_REQUIRED', message: 'Onaylı önizleme olmadan senkron yapılamaz' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE', message: `Dosya ${MAX_BYTES} byte sınırını aşıyor` }, { status: 400 })
    }

    if (mode === 'commit' && createHash('sha256').update(buffer).digest('hex') !== previewHash) {
      return NextResponse.json({ error: 'PREVIEW_MISMATCH', message: 'Dosya önizlemeden sonra değişti; yeniden önizleyin' }, { status: 409 })
    }

    if (mode === 'preview') {
      const preview = await previewWorkbookSync({ buffer, department })
      return NextResponse.json(preview)
    }

    const result = await commitWorkbookSync({ buffer, department })
    return NextResponse.json({
      message: `${result.deleted} görev silindi, ${result.inserted} görev yüklendi ve puanlar yeniden hesaplandı`,
      ...result,
    })
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 })
    }
    if (error instanceof WorkbookSyncError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: workbookSyncErrorStatus(error) })
    }
    console.error('Error syncing workbook:', error)
    return NextResponse.json({ error: 'Senkron hatası: ' + String(error) }, { status: 500 })
  }
}
