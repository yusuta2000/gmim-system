import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'

// Ana takip Excel'inden bölümün TÜM görevlerini yeniden-eşitleme mantığı.
// Yalnız seçili bölümün Task verisine dokunur. Kişi/şifre/diğer bölüm dokunulmaz.

export class WorkbookSyncError extends Error {
  constructor(
    public readonly code: 'EMPTY_FILE' | 'NO_PERSON_SHEETS' | 'ORPHAN_TASKS',
    message: string,
  ) {
    super(message)
    this.name = 'WorkbookSyncError'
  }
}

export type WorkbookTask = {
  number: number
  description: string
  hoursWorked: string | null
  date: Date
  dateMissing: boolean
  points: number
}

type AssistantLite = { id: string; name: string; totalPoints: number; isActive: boolean }
type CategoryLite = { id: string; name: string }

export type WorkbookPersonPlan = {
  assistantId: string
  name: string
  sheet: string
  newCount: number
  newPoints: number
  curCount: number
  curPoints: number
  curTotalPoints: number
}

export type WorkbookPreview = {
  fileHash: string
  department: string
  people: WorkbookPersonPlan[]
  totalTasks: number
  totalPoints: number
  unmatchedSheets: string[]
  ambiguousSheets: string[]
  orphansWithTasks: string[]
}

const norm = (s: unknown) => String(s ?? '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')

function hashBuffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return v
  const t = String(v ?? '').trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
    return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])))
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

function toPoints(v: unknown): number {
  if (typeof v === 'number') return Math.trunc(v)
  const n = parseInt(String(v ?? '').trim(), 10)
  return Number.isNaN(n) ? 0 : n
}

/** Bir kişi sayfasındaki görev satırlarını okur (col: Sayı, Görev, Saat, Tarih, Puan). */
export function parseSheetTasks(ws: XLSX.WorkSheet): WorkbookTask[] {
  const m = XLSX.utils.sheet_to_json<Array<unknown>>(ws, { header: 1, raw: true, blankrows: false })
  let h = 0
  for (let i = 0; i < Math.min(m.length, 5); i += 1) {
    const r = m[i] || []
    if (norm(r[0]).includes('sayı') || ['görev', 'görevi'].includes(norm(r[1]))) { h = i; break }
  }
  const tasks: WorkbookTask[] = []
  for (let i = h + 1; i < m.length; i += 1) {
    const r = m[i] || []
    const num = r[0]
    const desc = String(r[1] ?? '').trim()
    const hours = r[2] == null ? null : String(r[2]).trim() || null
    const pts = toPoints(r[4])
    if (!desc) continue
    if (['görev', 'görevi', 'toplam'].includes(norm(desc))) continue
    const hasNum = typeof num === 'number' || /^\d+$/.test(String(num ?? '').trim())
    const date = parseDate(r[3])
    if (!hasNum && !date && pts <= 0) continue
    tasks.push({
      number: hasNum ? Number(String(num).trim()) : tasks.length + 1,
      description: desc,
      hoursWorked: hours,
      date: (date ?? new Date(0)),
      dateMissing: !date,
      points: pts,
    })
  }
  // Tarihi boş görevleri kronolojik komşuya taşı (ileri-doldur + baştaki boşları geri-doldur).
  let last: Date | null = null
  for (const t of tasks) { if (!t.dateMissing) last = t.date; else if (last) t.date = last }
  const firstKnown = tasks.find((t) => !t.dateMissing)?.date ?? new Date(Date.UTC(2025, 6, 1))
  for (const t of tasks) { if (t.dateMissing) t.date = firstKnown }
  return tasks
}

/** Her Excel sayfasını bölümdeki bir kişiye (normalize substring) eşleştirir. */
export function matchSheetsToAssistants(
  wb: XLSX.WorkBook,
  assistants: AssistantLite[],
) {
  const matched: Array<{ assistant: AssistantLite; sheet: string; tasks: WorkbookTask[] }> = []
  const unmatchedSheets: string[] = []
  const ambiguousSheets: string[] = []
  const usedAssistant = new Set<string>()

  for (const sheet of wb.SheetNames) {
    const s = norm(sheet)
    const cands = assistants.filter((a) => {
      const n = norm(a.name)
      return n === s || n.includes(s) || s.includes(n)
    })
    if (cands.length === 0) { unmatchedSheets.push(sheet); continue }
    if (cands.length > 1) { ambiguousSheets.push(sheet); continue }
    const assistant = cands[0]
    if (usedAssistant.has(assistant.id)) { ambiguousSheets.push(sheet); continue }
    usedAssistant.add(assistant.id)
    matched.push({ assistant, sheet, tasks: parseSheetTasks(wb.Sheets[sheet]) })
  }
  return { matched, unmatchedSheets, ambiguousSheets }
}

function matchCategoryId(desc: string, cats: CategoryLite[]): string | null {
  const d = norm(desc)
  let best: CategoryLite | null = null
  for (const c of cats) {
    const cn = norm(c.name)
    if (!cn) continue
    if (d.includes(cn) || cn.includes(d)) {
      if (!best || cn.length > norm(best.name).length) best = c
    }
  }
  return best?.id ?? null
}

async function loadContext(department: string) {
  const assistants = await db.researchAssistant.findMany({
    where: { department },
    select: { id: true, name: true, totalPoints: true, isActive: true },
  })
  if (assistants.length === 0) {
    throw new WorkbookSyncError('NO_PERSON_SHEETS', 'Bu bölümde kayıtlı kişi yok')
  }
  const cats = await db.pointCategory.findMany({ where: { isActive: true }, select: { id: true, name: true } })
  const counts = await db.task.groupBy({
    by: ['assistantId'],
    where: { assistantId: { in: assistants.map((a) => a.id) } },
    _count: { _all: true },
    _sum: { points: true },
  })
  const curById = new Map(counts.map((c) => [c.assistantId, c]))
  return { assistants, cats, curById }
}

export async function previewWorkbookSync(input: {
  buffer: Buffer
  department: string
}): Promise<WorkbookPreview> {
  const wb = XLSX.read(input.buffer, { type: 'buffer', cellDates: true })
  if (wb.SheetNames.length === 0) throw new WorkbookSyncError('EMPTY_FILE', 'Dosya boş veya geçersiz')

  const { assistants, curById } = await loadContext(input.department)
  const { matched, unmatchedSheets, ambiguousSheets } = matchSheetsToAssistants(wb, assistants)
  if (matched.length === 0) {
    throw new WorkbookSyncError('NO_PERSON_SHEETS', 'Hiçbir sayfa bir kişiye eşleşmedi; ana takip dosyası mı?')
  }

  const matchedIds = new Set(matched.map((m) => m.assistant.id))
  const orphansWithTasks = assistants
    .filter((a) => !matchedIds.has(a.id) && (curById.get(a.id)?._count?._all ?? 0) > 0)
    .map((a) => a.name)

  const people: WorkbookPersonPlan[] = matched.map(({ assistant, sheet, tasks }) => {
    const cur = curById.get(assistant.id)
    return {
      assistantId: assistant.id,
      name: assistant.name,
      sheet,
      newCount: tasks.length,
      newPoints: tasks.reduce((s, t) => s + t.points, 0),
      curCount: cur?._count?._all ?? 0,
      curPoints: cur?._sum?.points ?? 0,
      curTotalPoints: assistant.totalPoints,
    }
  })

  return {
    fileHash: hashBuffer(input.buffer),
    department: input.department,
    people,
    totalTasks: people.reduce((s, p) => s + p.newCount, 0),
    totalPoints: people.reduce((s, p) => s + p.newPoints, 0),
    unmatchedSheets,
    ambiguousSheets,
    orphansWithTasks,
  }
}

export async function commitWorkbookSync(input: {
  buffer: Buffer
  department: string
}): Promise<{ deleted: number; inserted: number }> {
  const wb = XLSX.read(input.buffer, { type: 'buffer', cellDates: true })
  const { assistants, cats, curById } = await loadContext(input.department)
  const { matched } = matchSheetsToAssistants(wb, assistants)
  if (matched.length === 0) {
    throw new WorkbookSyncError('NO_PERSON_SHEETS', 'Hiçbir sayfa bir kişiye eşleşmedi; ana takip dosyası mı?')
  }

  const matchedIds = new Set(matched.map((m) => m.assistant.id))
  const orphans = assistants.filter((a) => !matchedIds.has(a.id) && (curById.get(a.id)?._count?._all ?? 0) > 0)
  if (orphans.length > 0) {
    throw new WorkbookSyncError('ORPHAN_TASKS',
      `Excel sayfası eşleşmeyen ama görevi olan kişi(ler): ${orphans.map((o) => o.name).join(', ')}`)
  }

  const departmentIds = assistants.map((a) => a.id)
  const rows = matched.flatMap(({ assistant, tasks }) =>
    tasks.map((t) => ({
      number: t.number,
      description: t.description,
      hoursWorked: t.hoursWorked,
      date: t.date,
      points: t.points,
      status: 'approved',
      source: 'import',
      assistantId: assistant.id,
      categoryId: matchCategoryId(t.description, cats),
    })),
  )

  return db.$transaction(async (tx) => {
    const del = await tx.task.deleteMany({ where: { assistantId: { in: departmentIds } } })
    if (rows.length > 0) await tx.task.createMany({ data: rows })
    for (const a of assistants) {
      const sum = await tx.task.aggregate({
        where: { assistantId: a.id, status: 'approved' },
        _sum: { points: true },
      })
      await tx.researchAssistant.update({ where: { id: a.id }, data: { totalPoints: sum._sum.points ?? 0 } })
    }
    return { deleted: del.count, inserted: rows.length }
  }, { timeout: 120000, maxWait: 20000 })
}

export function workbookSyncErrorStatus(_error: WorkbookSyncError) {
  return 400
}

export type { SessionUser }
