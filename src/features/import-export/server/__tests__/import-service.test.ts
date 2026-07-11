import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (callback) => callback(db)),
    researchAssistant: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    importBatch: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    importBatchRow: {
      create: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { commitImport, previewImport, rollbackImportBatch } from '../import-service'
import type { SessionUser } from '@/lib/auth/session-repository'

const researchAssistant = db.researchAssistant as unknown as {
  findMany: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const importBatch = db.importBatch as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const importBatchRow = db.importBatchRow as unknown as {
  create: ReturnType<typeof vi.fn>
}
const task = db.task as unknown as {
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const admin: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const csv = Buffer.from('Araş Gör,Görev,Tarih,Puan\nAda Lovelace,Rapor,11.07.2026,5', 'utf8')

describe('import service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    researchAssistant.findMany.mockResolvedValue([{ id: 'assistant-1', name: 'Ada Lovelace', department: 'GMIM' }])
    researchAssistant.update.mockResolvedValue({})
    importBatch.findUnique.mockResolvedValue(null)
    importBatch.create.mockResolvedValue({ id: 'batch-1' })
    importBatch.update.mockResolvedValue({})
    importBatchRow.create.mockResolvedValue({})
    task.findFirst.mockResolvedValue(null)
    task.create.mockResolvedValue({ id: 'task-1' })
    task.delete.mockResolvedValue({})
  })

  it('preview resolves rows without writing import batch data', async () => {
    const preview = await previewImport({ fileName: 'tasks.csv', buffer: csv, importType: 'tasks', department: 'GMIM' })

    expect(preview.rows[0]).toEqual(expect.objectContaining({ status: 'ready', assistantId: 'assistant-1' }))
    expect(importBatch.create).not.toHaveBeenCalled()
    expect(task.create).not.toHaveBeenCalled()
  })

  it('reports unresolved names instead of fuzzy importing silently', async () => {
    researchAssistant.findMany.mockResolvedValue([{ id: 'assistant-1', name: 'Different Name', department: 'GMIM' }])

    const preview = await previewImport({ fileName: 'tasks.csv', buffer: csv, importType: 'tasks', department: 'GMIM' })

    expect(preview.rows[0]).toEqual(expect.objectContaining({
      status: 'error',
      message: expect.stringContaining('bulunamadı'),
    }))
  })

  it('commit writes a batch and task rows in one transaction', async () => {
    const result = await commitImport({ fileName: 'tasks.csv', buffer: csv, importType: 'tasks', department: 'GMIM', createdBy: admin })

    expect(result).toEqual(expect.objectContaining({ duplicate: false, imported: 1 }))
    expect(importBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'committed', createdById: 'admin-1' }),
    }))
    expect(task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assistantId: 'assistant-1', source: 'import', status: 'approved' }),
    }))
  })

  it('duplicate file hashes do not create another import', async () => {
    importBatch.findUnique.mockResolvedValue({ id: 'batch-existing', rows: [] })

    const result = await commitImport({ fileName: 'tasks.csv', buffer: csv, importType: 'tasks', department: 'GMIM', createdBy: admin })

    expect(result).toEqual(expect.objectContaining({ duplicate: true, imported: 0 }))
    expect(importBatch.create).not.toHaveBeenCalled()
    expect(task.create).not.toHaveBeenCalled()
  })

  it('rollback removes imported approved tasks and decrements points', async () => {
    importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'committed',
      rows: [{ task: { id: 'task-1', status: 'approved', points: 5, assistantId: 'assistant-1' } }],
    })

    const result = await rollbackImportBatch({ batchId: 'batch-1', requester: admin })

    expect(result).toEqual({ rolledBack: 1 })
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'assistant-1' },
      data: { totalPoints: { decrement: 5 } },
    })
    expect(task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } })
    expect(importBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'rolled_back' }),
    }))
  })
})
