import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'
import type { ImportType, ParsedExamRow, ParsedTaskRow } from './schemas'
import { parseImportFile } from './parser'

export class ImportServiceError extends Error {
  constructor(
    public readonly code: 'BAD_REQUEST' | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'ImportServiceError'
  }
}

export function importErrorStatus(error: ImportServiceError) {
  return error.code === 'CONFLICT' ? 409 : 400
}

type AssistantLookup = {
  id: string
  name: string
  department: string
}

type TaskPreviewRow = {
  rowNumber: number
  status: string
  message: string | null
  assistantId: string | null
  raw: ParsedTaskRow
}

type ExamPreviewRow = {
  rowNumber: number
  status: string
  message: string | null
  raw: ParsedExamRow
}

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

function resolveAssistant(row: ParsedTaskRow, assistants: AssistantLookup[]) {
  const normalized = normalizeName(row.assistantName)
  const matches = assistants.filter((assistant) => normalizeName(assistant.name) === normalized)
  if (matches.length === 1) return { assistant: matches[0], warning: null }
  if (matches.length > 1) {
    return { assistant: null, warning: `Belirsiz isim eşleşmesi: ${row.assistantName}` }
  }
  return { assistant: null, warning: `Araştırma görevlisi bulunamadı: ${row.assistantName}` }
}

export async function previewImport(input: {
  fileName: string
  buffer: Buffer
  importType: ImportType
  department: SessionUser['department']
}) {
  const parsed = parseImportFile(input)
  if (parsed.type !== 'tasks') {
    return {
      fileHash: hashBuffer(input.buffer),
      type: parsed.type,
      rows: parsed.rows.map((row) => ({ rowNumber: row.rowNumber, status: 'ready', message: null, raw: row })),
      warnings: parsed.warnings,
    }
  }

  const assistants = await db.researchAssistant.findMany({
    where: { department: input.department, isActive: true },
    select: { id: true, name: true, department: true },
  })

  const rows = parsed.rows.map((row) => {
    const resolved = resolveAssistant(row, assistants)
    return {
      rowNumber: row.rowNumber,
      status: resolved.assistant ? 'ready' : 'error',
      message: resolved.warning,
      assistantId: resolved.assistant?.id ?? null,
      raw: row,
    }
  })

  return {
    fileHash: hashBuffer(input.buffer),
    type: parsed.type,
    rows,
    warnings: parsed.warnings,
  }
}

export async function commitImport(input: {
  fileName: string
  buffer: Buffer
  importType: ImportType
  department: SessionUser['department']
  createdBy: SessionUser
}) {
  const preview = await previewImport(input)
  const errorRows = preview.rows.filter((row) => row.status === 'error')
  if (errorRows.length > 0) {
    throw new ImportServiceError('BAD_REQUEST', 'Hatalı satırlar düzeltilmeden import yapılamaz')
  }

  return db.$transaction(async (tx) => {
    const duplicate = await tx.importBatch.findUnique({
      where: {
        fileHash_importType_department: {
          fileHash: preview.fileHash,
          importType: input.importType,
          department: input.department,
        },
      },
      include: { rows: true },
    })
    if (duplicate) {
      return { batch: duplicate, duplicate: true, imported: 0 }
    }

    const batch = await tx.importBatch.create({
      data: {
        fileName: input.fileName,
        fileHash: preview.fileHash,
        importType: input.importType,
        department: input.department,
        status: 'committed',
        createdById: input.createdBy.id,
        committedAt: new Date(),
      },
    })

    let imported = 0
    if (preview.type === 'exams') {
      for (const row of preview.rows as ExamPreviewRow[]) {
        const exam = await tx.exam.create({
          data: {
            courseCode: row.raw.courseCode,
            courseName: row.raw.courseName,
            instructor: row.raw.instructor,
            date: row.raw.date,
            day: row.raw.day,
            timeSlot: row.raw.timeSlot,
            requiredSupervisors: row.raw.requiredSupervisors,
            department: input.department,
          },
        })
        await tx.importBatchRow.create({
          data: {
            batchId: batch.id,
            rowNumber: row.rowNumber,
            status: 'imported',
            raw: { ...row.raw, date: row.raw.date.toISOString() },
            message: `exam:${exam.id}`,
          },
        })
        imported += 1
      }
      return { batch, duplicate: false, imported }
    }

    for (const row of preview.rows as TaskPreviewRow[]) {
      const maxTask = await tx.task.findFirst({
        where: { assistantId: row.assistantId ?? undefined },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const task = await tx.task.create({
        data: {
          number: (maxTask?.number || 0) + 1,
          description: row.raw.description,
          hoursWorked: row.raw.hoursWorked,
          date: row.raw.date,
          points: row.raw.points,
          status: 'approved',
          source: 'import',
          assistantId: row.assistantId as string,
        },
      })
      if (row.raw.points > 0) {
        await tx.researchAssistant.update({
          where: { id: row.assistantId as string },
          data: { totalPoints: { increment: row.raw.points } },
        })
      }
      await tx.importBatchRow.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          status: 'imported',
          raw: { ...row.raw, date: row.raw.date.toISOString() },
          taskId: task.id,
        },
      })
      imported += 1
    }

    return { batch, duplicate: false, imported }
  })
}

export async function rollbackImportBatch(input: {
  batchId: string
  requester: SessionUser
}) {
  return db.$transaction(async (tx) => {
    const batch = await tx.importBatch.findUnique({
      where: { id: input.batchId },
      include: { rows: { include: { task: true } } },
    })
    if (!batch) {
      throw new ImportServiceError('BAD_REQUEST', 'Import batch bulunamadı')
    }
    if (batch.status === 'rolled_back') {
      return { rolledBack: 0 }
    }

    let rolledBack = 0
    for (const row of batch.rows) {
      if (!row.task) continue
      if (row.task.status === 'approved' && row.task.points > 0) {
        await tx.researchAssistant.update({
          where: { id: row.task.assistantId },
          data: { totalPoints: { decrement: row.task.points } },
        })
      }
      await tx.task.delete({ where: { id: row.task.id } })
      rolledBack += 1
    }

    await tx.importBatch.update({
      where: { id: input.batchId },
      data: { status: 'rolled_back', rolledBackAt: new Date() },
    })

    return { rolledBack }
  })
}
