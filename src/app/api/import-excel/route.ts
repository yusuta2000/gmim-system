import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session-repository';
import { assertDepartmentAccess } from '@/lib/authorization/department';
import { AuthorizationError } from '@/lib/authorization/errors';
import { requireRole } from '@/lib/authorization/roles';
import { ImportParseError, parseImportFile } from '@/features/import-export/server/parser';
import { importTypeSchema, type ParsedTaskRow } from '@/features/import-export/server/schemas';

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ');
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    requireRole(user, ['admin', 'dekan', 'baskan']);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = importTypeSchema.parse((formData.get('type') as string) || 'tasks');
    const mode = ((formData.get('mode') as string) || 'commit') as 'preview' | 'commit';
    const department = ((formData.get('department') as string) || user.department) as SessionUser['department'];
    assertDepartmentAccess(user, department);

    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseImportFile({ fileName: file.name, buffer, importType });

    if (mode === 'preview') {
      return NextResponse.json(parsed);
    }

    const result = await db.$transaction(async (tx) => {
      const importLog = await tx.importLog.create({
        data: {
          fileName: file.name,
          fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
          status: 'processing',
        },
      });

      let imported = 0;

      if (parsed.type === 'tasks') {
        const assistants = await tx.researchAssistant.findMany({ where: { department, isActive: true } });
        for (const row of parsed.rows as ParsedTaskRow[]) {
          const matches = assistants.filter((assistant) => normalizeName(assistant.name) === normalizeName(row.assistantName));
          if (matches.length !== 1) {
            throw new Error(matches.length > 1
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
              department,
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

      return { imported, importLogId: importLog.id };
    });

    return NextResponse.json({
      message: `${result.imported} kayıt başarıyla içe aktarıldı`,
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

    console.error('Error importing file:', error);
    return NextResponse.json({ error: 'Dosya içe aktarma hatası: ' + String(error) }, { status: 500 });
  }
}
