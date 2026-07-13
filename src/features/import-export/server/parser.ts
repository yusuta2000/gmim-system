import * as XLSX from 'xlsx'
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  type ImportParseWarning,
  type ImportType,
  type ParsedImport,
  parsedExamRowSchema,
  parsedTaskRowSchema,
} from './schemas'

export class ImportParseError extends Error {
  constructor(
    public readonly code: 'UNSUPPORTED_FILE' | 'FILE_TOO_LARGE' | 'ROW_LIMIT' | 'EMPTY_FILE' | 'INVALID_ROW',
    message: string,
    public readonly warnings: ImportParseWarning[] = [],
  ) {
    super(message)
    this.name = 'ImportParseError'
  }
}

type Matrix = string[][]

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('tr-TR')
}

function parseCsv(text: string): Matrix {
  const rows: Matrix = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && (char === ',' || char === ';' || char === '\t')) {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function parseTurkishDate(value: string | number | Date | undefined) {
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }
  const text = String(value ?? '').trim()
  if (!text) return new Date()

  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (match) {
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1])))
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Geçersiz tarih: ${text}`)
  }
  return date
}

function matrixFromXlsx(buffer: Buffer): Matrix {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) return []
  return XLSX.utils.sheet_to_json<Array<string | number | Date>>(workbook.Sheets[firstSheet], {
    header: 1,
    raw: true,
    blankrows: false,
    // Seyrek (sparse) satırlarda boş hücreler delik olarak gelir; Array.from ile
    // yoğunlaştırıp undefined delikleri boş string yaparız (aksi halde header.includes çöker).
  }).map((row) => Array.from(row, (cell) => String(cell ?? '').trim()))
}

function indexOf(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => (header ?? '').includes(candidate)))
}

function readMatrix(input: { fileName: string; buffer: Buffer }) {
  if (input.buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportParseError('FILE_TOO_LARGE', `Dosya ${MAX_IMPORT_BYTES} byte sınırını aşıyor`)
  }
  if (input.fileName.toLocaleLowerCase('tr-TR').endsWith('.xlsx')) {
    return matrixFromXlsx(input.buffer)
  }
  if (input.fileName.toLocaleLowerCase('tr-TR').endsWith('.csv')) {
    return parseCsv(input.buffer.toString('utf8'))
  }
  throw new ImportParseError('UNSUPPORTED_FILE', 'Sadece CSV ve XLSX desteklenir')
}

export function parseImportFile(input: {
  fileName: string
  buffer: Buffer
  importType: ImportType
}): ParsedImport {
  const matrix = readMatrix(input)
  if (matrix.length < 2) {
    throw new ImportParseError('EMPTY_FILE', 'Dosya boş veya geçersiz format')
  }
  if (matrix.length - 1 > MAX_IMPORT_ROWS) {
    throw new ImportParseError('ROW_LIMIT', `Dosya ${MAX_IMPORT_ROWS} satır sınırını aşıyor`)
  }

  const headers = matrix[0].map(normalizeHeader)
  const warnings: ImportParseWarning[] = []

  if (input.importType === 'tasks') {
    const descIdx = indexOf(headers, ['görev', 'gorev', 'task', 'açıklama', 'aciklama'])
    const assIdx = indexOf(headers, ['araş', 'aras', 'gör', 'gor', 'assistant', 'isim', 'ad soyad'])
    const dateIdx = indexOf(headers, ['tarih', 'date'])
    const pointsIdx = indexOf(headers, ['puan', 'point'])
    const hoursIdx = indexOf(headers, ['saat', 'hour'])

    const rows = matrix.slice(1).map((cols, index) => parsedTaskRowSchema.parse({
      rowNumber: index + 2,
      description: descIdx >= 0 ? cols[descIdx] : cols[1],
      assistantName: assIdx >= 0 ? cols[assIdx] : cols[0],
      date: parseTurkishDate(dateIdx >= 0 ? cols[dateIdx] : undefined),
      points: pointsIdx >= 0 ? Number.parseInt(cols[pointsIdx] || '0', 10) || 0 : 0,
      hoursWorked: hoursIdx >= 0 && cols[hoursIdx] ? cols[hoursIdx] : null,
    }))
    return { type: 'tasks', rows, warnings }
  }

  const codeIdx = indexOf(headers, ['kod', 'code'])
  const nameIdx = indexOf(headers, ['ders', 'ad'])
  const instrIdx = indexOf(headers, ['öğretim', 'ogretim', 'hoca', 'instructor'])
  const dateIdx = indexOf(headers, ['tarih', 'date'])
  const dayIdx = indexOf(headers, ['gün', 'gun', 'day'])
  const timeIdx = indexOf(headers, ['saat', 'time'])
  const supIdx = indexOf(headers, ['gözetmen', 'gozetmen', 'supervisor'])

  const rows = matrix.slice(1).map((cols, index) => parsedExamRowSchema.parse({
    rowNumber: index + 2,
    courseCode: codeIdx >= 0 ? cols[codeIdx] : cols[0],
    courseName: nameIdx >= 0 ? cols[nameIdx] : cols[1],
    instructor: instrIdx >= 0 ? cols[instrIdx] : '',
    date: parseTurkishDate(dateIdx >= 0 ? cols[dateIdx] : undefined),
    day: dayIdx >= 0 ? cols[dayIdx] : '',
    timeSlot: timeIdx >= 0 ? cols[timeIdx] : '',
    requiredSupervisors: supIdx >= 0 ? Number.parseInt(cols[supIdx] || '1', 10) || 1 : 1,
  }))

  return { type: 'exams', rows, warnings }
}
