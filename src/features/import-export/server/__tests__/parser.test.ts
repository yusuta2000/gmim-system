import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseImportFile } from '../parser'
import { MAX_IMPORT_ROWS } from '../schemas'

describe('import parser', () => {
  it('parses quoted CSV fields without splitting embedded delimiters', () => {
    const csv = [
      'Araş Gör,Görev,Tarih,Puan,Saat',
      '"Ada Lovelace","Komisyon, toplantı ve rapor","11.07.2026","5","2"',
    ].join('\n')

    const parsed = parseImportFile({
      fileName: 'tasks.csv',
      buffer: Buffer.from(csv, 'utf8'),
      importType: 'tasks',
    })

    expect(parsed.type).toBe('tasks')
    expect(parsed.rows[0]).toEqual(expect.objectContaining({
      assistantName: 'Ada Lovelace',
      description: 'Komisyon, toplantı ve rapor',
      points: 5,
      hoursWorked: '2',
    }))
    expect(parsed.rows[0].date.toISOString()).toContain('2026-07-11')
  })

  it('parses real XLSX buffers as spreadsheets', () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Araş Gör', 'Görev', 'Tarih', 'Puan'],
      ['Grace Hopper', 'Sınav gözetmenliği', '09.06.2026', 4],
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const parsed = parseImportFile({ fileName: 'tasks.xlsx', buffer, importType: 'tasks' })

    expect(parsed.rows[0]).toEqual(expect.objectContaining({
      assistantName: 'Grace Hopper',
      description: 'Sınav gözetmenliği',
      points: 4,
    }))
  })

  it('rejects files above the row limit', () => {
    const rows = ['Araş Gör,Görev,Tarih,Puan']
    for (let i = 0; i < MAX_IMPORT_ROWS + 1; i += 1) {
      rows.push(`A ${i},G ${i},01.01.2026,1`)
    }

    expect(() => parseImportFile({
      fileName: 'tasks.csv',
      buffer: Buffer.from(rows.join('\n'), 'utf8'),
      importType: 'tasks',
    })).toThrow(/satır sınırını/)
  })
})
