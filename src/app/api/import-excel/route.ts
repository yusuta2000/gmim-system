import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import { ImportParseError, parseImportFile } from '@/features/import-export/server/parser';
import { importTypeSchema, type ImportType, type ParsedTaskRow } from '@/features/import-export/server/schemas';
import {
  commitImport,
  ImportServiceError,
  importErrorStatus,
  previewImport,
} from '@/features/import-export/server/import-service';

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

function isMissingImportBatchStorage(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === 'P2021'
    || candidate?.code === 'P2022'
    || /ImportBatch|ImportBatchRow|does not exist|column .* does not exist/i.test(candidate?.message ?? '');
}

async function commitLegacyImport(input: {
  fileName: string;
  buffer: Buffer;
  importType: ImportType;
  department: SessionUser['department'];
}) {
  const parsed = parseImportFile(input);

  return db.$transaction(async (tx) => {
    const importLog = await tx.importLog.create({
      data: {
        fileName: input.fileName,
        fileType: input.fileName.endsWith('.csv') ? 'csv' : 'xlsx',
        status: 'processing',
      },
    });

    let imported = 0;

    if (parsed.type === 'tasks') {
      const assistants = await tx.researchAssistant.findMany({
        where: { department: input.department, isActive: true },
      });

      for (const row of parsed.rows as ParsedTaskRow[]) {
        const matches = assistants.filter((assistant) => normalizeName(assistant.name) === normalizeName(row.assistantName));
        if (matches.length !== 1) {
          throw new ImportServiceError('BAD_REQUEST', matches.length > 1
            ? `Belirsiz isim eşleşmesi: ${row.assistantName}`
            : `Araştırma görevlisi bulunamadı: ${row.assistantName}`);
        }

        const assistant = matches[0];
        const maxTask = await tx.task.findFirst({
          where: { assistantId: assistant.id },
          orderBy: { number: 'desc' },
          select: { number: true },
        });

        await tx.task.create({
          data: {
            number: (maxTask?.number || 0) + 1,
            description: row.description,
            hoursWorked: row.hoursWorked,
            date: row.date,
            points: row.points,
            status: 'approved',
            source: 'import',
            assistantId: assistant.id,
          },
        });

        if (row.points > 0) {
          await tx.researchAssistant.update({
            where: { id: assistant.id },
            data: { totalPoints: { increment: row.points } },
          });
        }

        imported += 1;
      }
    } else {
      for (const row of parsed.rows) {
        await tx.exam.create({
          data: {
            courseCode: row.courseCode,
            courseName: row.courseName,
            instructor: row.instructor,
            date: row.date,
            day: row.day,
            timeSlot: row.timeSlot,
            department: input.department,
            requiredSupervisors: row.requiredSupervisors,
          },
        });
        imported += 1;
      }
    }

    await tx.importLog.update({
      where: { id: importLog.id },
      data: { recordCount: imported, status: 'completed' },
    });

    return { imported, importLogId: importLog.id, duplicate: false };
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = importTypeSchema.parse((formData.get('type') as string) || 'tasks');
    const mode = formData.get('mode') as string | null;
    const previewHash = formData.get('previewHash') as string | null;
    const department = ((formData.get('department') as string) || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);

    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 400 });
    }

    if (mode !== 'preview' && mode !== 'commit') {
      return NextResponse.json({ error: 'PREVIEW_REQUIRED', message: 'Önce dosya önizlemesi oluşturun' }, { status: 400 });
    }
    if (mode === 'commit' && !previewHash) {
      return NextResponse.json({ error: 'PREVIEW_REQUIRED', message: 'Onaylı önizleme olmadan içe aktarma yapılamaz' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (mode === 'commit' && createHash('sha256').update(buffer).digest('hex') !== previewHash) {
      return NextResponse.json({ error: 'PREVIEW_MISMATCH', message: 'Dosya önizlemeden sonra değişti; yeniden önizleyin' }, { status: 409 });
    }

    if (mode === 'preview') {
      const preview = await previewImport({ fileName: file.name, buffer, importType, department });
      return NextResponse.json(preview);
    }

    let result: { imported: number; importLogId?: string; duplicate: boolean };
    try {
      const committed = await commitImport({ fileName: file.name, buffer, importType, department, createdBy: user });
      result = {
        imported: committed.imported,
        duplicate: committed.duplicate,
      };
    } catch (error) {
      if (!isMissingImportBatchStorage(error)) throw error;
      result = await commitLegacyImport({ fileName: file.name, buffer, importType, department });
    }

    return NextResponse.json({
      message: result.duplicate
        ? 'Bu dosya daha önce içe aktarılmış; tekrar kayıt oluşturulmadı'
        : `${result.imported} kayıt başarıyla içe aktarıldı`,
      imported: result.imported,
      importLogId: result.importLogId,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    if (error instanceof ImportParseError) {
      return NextResponse.json({ error: error.code, message: error.message, warnings: error.warnings }, { status: 400 });
    }
    if (error instanceof ImportServiceError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: importErrorStatus(error) });
    }

    console.error('Error importing file:', error);
    return NextResponse.json({ error: 'Dosya içe aktarma hatası: ' + String(error) }, { status: 500 });
  }
}
