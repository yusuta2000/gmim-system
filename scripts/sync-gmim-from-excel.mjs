// Tam yeniden-eşitleme: GMİM görevlerini bir Excel ana takip dosyasından yeniden yükler.
// GÜVENLİK: yalnız GMİM Task verisine dokunur. Kişi/şifre/DUİM'e ASLA dokunmaz.
// Varsayılan: DRY-RUN (hiçbir şey yazmaz). Yazmak için: --commit
//
// Çalıştırma (repo kökünden):
//   node --env-file=.env.local scripts/sync-gmim-from-excel.mjs "<dosya.xlsx>"            # dry-run
//   node --env-file=.env.local scripts/sync-gmim-from-excel.mjs "<dosya.xlsx>" --commit   # uygula

import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const DEPT = 'GMIM'
const args = process.argv.slice(2)
const COMMIT = args.includes('--commit')
const filePath = args.find((a) => !a.startsWith('--'))
if (!filePath) {
  console.error('Kullanım: node --env-file=.env.local scripts/sync-gmim-from-excel.mjs "<dosya.xlsx>" [--commit]')
  process.exit(1)
}

// Excel sayfa adı -> sistemdeki kanonik kişi adı
const personSheets = {
  'Begüm DOGANAY': 'Begüm DOGANAY',
  'Fatih NACAR': 'Fatih NACAR',
  'Y.Tarık MUTLU': 'Y.Tarık MUTLU',
  'Merve GÜL ÇIVGIN': 'Merve GÜL ÇIVGIN',
  'Samet BİÇEN': 'Samet BİÇEN',
  'Sinan COŞKUN': 'Sinan COŞKUN',
  'Rukiye GÜLMEZ': 'Rukiye GÜLMEZ',
  'Cenk KAYA': 'Cenk KAYA',
  'Berkehan İNAL': 'Ö. Berkehan İnal',
  'Muhittin ORHAN': 'Muhittin ORHAN',
}

const norm = (s) => String(s ?? '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')

function parseDate(v) {
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

function toPoints(v) {
  if (typeof v === 'number') return Math.trunc(v)
  const n = parseInt(String(v ?? '').trim(), 10)
  return Number.isNaN(n) ? 0 : n
}

function parseSheet(ws) {
  const m = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false })
  // Başlık satırını bul (col0~'sayı' veya col1~'görev')
  let h = 0
  for (let i = 0; i < Math.min(m.length, 5); i++) {
    const r = m[i] || []
    if (norm(r[0]).includes('sayı') || ['görev', 'görevi'].includes(norm(r[1]))) { h = i; break }
  }
  const tasks = []
  const skipped = []
  for (let i = h + 1; i < m.length; i++) {
    const r = m[i] || []
    const num = r[0]
    const desc = String(r[1] ?? '').trim()
    const hours = r[2] == null ? null : String(r[2]).trim() || null
    const dateRaw = r[3]
    const pts = toPoints(r[4])
    if (!desc) continue
    if (['görev', 'görevi', 'toplam'].includes(norm(desc))) continue // başlık/özet satırı
    const hasNum = typeof num === 'number' || /^\d+$/.test(String(num ?? '').trim())
    const date = parseDate(dateRaw)
    // Gerçek görev: açıklaması var VE (sıra no || tarih || puan>0). Aksi halde atla.
    if (!hasNum && !date && pts <= 0) { skipped.push({ row: i + 1, desc, reason: 'sayı/tarih/puan yok' }); continue }
    tasks.push({
      number: hasNum ? Number(String(num).trim()) : tasks.length + 1,
      description: desc,
      hoursWorked: hours,
      date, // null olabilir; aşağıda taşınır
      dateMissing: !date,
      points: pts,
    })
  }
  // Tarihi boş görevleri kronolojik komşuya taşı: önce ileri-doldur (önceki tarih),
  // baştaki boşları ilk bilinen tarihle geri-doldur.
  let last = null
  for (const t of tasks) { if (t.date) last = t.date; else if (last) t.date = last }
  const firstKnown = tasks.find((t) => t.date)?.date ?? new Date(Date.UTC(2025, 6, 1))
  for (const t of tasks) { if (!t.date) t.date = firstKnown }
  return { tasks, skipped }
}

function matchCategory(desc, cats) {
  const d = norm(desc)
  let best = null
  for (const c of cats) {
    const cn = norm(c.name)
    if (!cn) continue
    if (d.includes(cn) || cn.includes(d)) {
      if (!best || cn.length > norm(best.name).length) best = c
    }
  }
  return best?.id ?? null
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const wb = XLSX.read(readFileSync(filePath), { type: 'buffer', cellDates: true })
    const gmim = await prisma.researchAssistant.findMany({
      where: { department: DEPT },
      select: { id: true, name: true, totalPoints: true, isActive: true },
    })
    const byNorm = new Map(gmim.map((a) => [norm(a.name), a]))
    const cats = await prisma.pointCategory.findMany({ where: { isActive: true }, select: { id: true, name: true } })

    const currentTaskCounts = await prisma.task.groupBy({
      by: ['assistantId'],
      where: { assistantId: { in: gmim.map((a) => a.id) } },
      _count: { _all: true },
      _sum: { points: true },
    })
    const curById = new Map(currentTaskCounts.map((c) => [c.assistantId, c]))

    const plan = []
    const errors = []
    const dump = []
    let grandTasks = 0, grandPoints = 0, catMatched = 0, dateMissingTotal = 0

    for (const [sheet, person] of Object.entries(personSheets)) {
      const ws = wb.Sheets[sheet]
      if (!ws) { errors.push(`Sayfa yok: ${sheet}`); continue }
      const assistant = byNorm.get(norm(person))
      if (!assistant) { errors.push(`Sistemde kişi bulunamadı: ${person} (sayfa ${sheet})`); continue }
      const { tasks, skipped } = parseSheet(ws)
      const withCat = tasks.map((t) => ({ ...t, categoryId: matchCategory(t.description, cats) }))
      catMatched += withCat.filter((t) => t.categoryId).length
      dateMissingTotal += withCat.filter((t) => t.dateMissing).length
      const pts = withCat.reduce((s, t) => s + t.points, 0)
      grandTasks += withCat.length; grandPoints += pts
      const cur = curById.get(assistant.id)
      plan.push({
        assistant, person,
        newCount: withCat.length, newPoints: pts,
        curCount: cur?._count?._all ?? 0, curPoints: cur?._sum?.points ?? 0,
        curTotalPoints: assistant.totalPoints,
        skipped: skipped.length,
      })
      for (const t of withCat) dump.push({ person, ...t, date: t.date.toISOString().slice(0, 10) })
    }

    // Rapor
    console.log(`\n=== DRY-RUN RAPORU (${DEPT}) — ${COMMIT ? 'COMMIT MODU' : 'yalnız önizleme, YAZMA YOK'} ===`)
    console.log('Kişi'.padEnd(20), 'Excel(görev/puan)'.padEnd(20), 'Sistem(görev/puan)'.padEnd(20), 'totalPoints→')
    console.log('-'.repeat(84))
    for (const p of plan) {
      console.log(
        p.person.padEnd(20),
        `${p.newCount}/${p.newPoints}`.padEnd(20),
        `${p.curCount}/${p.curPoints}`.padEnd(20),
        `${p.curTotalPoints} → ${p.newPoints}`,
        p.skipped ? `(atlanan ${p.skipped})` : '',
      )
    }
    console.log('-'.repeat(84))
    console.log(`TOPLAM  Excel: ${grandTasks} görev / ${grandPoints} puan`)
    console.log(`Kategori eşleşen görev: ${catMatched}/${grandTasks} · tarihi okunamayan: ${dateMissingTotal}`)

    const outPath = filePath.replace(/\.[^.]+$/, '') + '.parsed.json'
    writeFileSync(outPath, JSON.stringify(dump, null, 2))
    console.log(`Tam görev dökümü: ${outPath} (${dump.length} satır)`)

    // Koruma: Excel sayfası olmayan ama mevcut görevi olan GMİM kişisi varsa,
    // tam-sil işlemi onların verisini silip geri yükleyemez → commit'i durdur.
    const coveredIds = new Set(plan.map((p) => p.assistant.id))
    for (const a of gmim) {
      const cur = curById.get(a.id)
      if ((cur?._count?._all ?? 0) > 0 && !coveredIds.has(a.id)) {
        errors.push(`GMİM kişisinin Excel sayfası yok ama ${cur._count._all} mevcut görevi var: ${a.name} (silinir, geri yüklenmez)`)
      }
    }

    if (errors.length) {
      console.log('\n⛔ HATALAR (commit engellendi):')
      for (const e of errors) console.log('  -', e)
      process.exit(2)
    }

    if (!COMMIT) {
      console.log('\nℹ️  Bu bir DRY-RUN. Uygulamak için sonuna --commit ekleyin.')
      return
    }

    // COMMIT: yalnız GMİM görevlerini sil, Excel'den yeniden yükle, totalPoints yeniden hesapla
    const gmimIds = gmim.map((a) => a.id)

    // Güvenlik yedeği: silmeden önce mevcut GMİM görevlerini + totalPoints'i diske dök.
    const backup = {
      takenAt: new Date().toISOString(),
      assistants: gmim,
      tasks: await prisma.task.findMany({ where: { assistantId: { in: gmimIds } } }),
    }
    const backupPath = filePath.replace(/\.[^.]+$/, '') + `.gmim-backup-${Date.now()}.json`
    writeFileSync(backupPath, JSON.stringify(backup, null, 2))
    console.log(`\n💾 Yedek alındı: ${backupPath} (${backup.tasks.length} görev)`)
    await prisma.$transaction(async (tx) => {
      const del = await tx.task.deleteMany({ where: { assistantId: { in: gmimIds } } })
      console.log(`\nSilinen GMİM görev: ${del.count}`)
      let inserted = 0
      for (const [sheet, person] of Object.entries(personSheets)) {
        const ws = wb.Sheets[sheet]
        if (!ws) continue
        const assistant = byNorm.get(norm(person))
        if (!assistant) continue
        const { tasks } = parseSheet(ws)
        if (!tasks.length) continue
        await tx.task.createMany({
          data: tasks.map((t) => ({
            number: t.number,
            description: t.description,
            hoursWorked: t.hoursWorked,
            date: t.date,
            points: t.points,
            status: 'approved',
            source: 'import',
            assistantId: assistant.id,
            categoryId: matchCategory(t.description, cats),
          })),
        })
        inserted += tasks.length
      }
      console.log(`Eklenen görev: ${inserted}`)
      // totalPoints yeniden hesap (yalnız GMİM)
      for (const a of gmim) {
        const sum = await tx.task.aggregate({
          where: { assistantId: a.id, status: 'approved' },
          _sum: { points: true },
        })
        await tx.researchAssistant.update({
          where: { id: a.id },
          data: { totalPoints: sum._sum.points ?? 0 },
        })
      }
      console.log('totalPoints yeniden hesaplandı (GMİM).')
    }, { timeout: 120000, maxWait: 20000 })
    console.log('\n✅ COMMIT tamam. Sadece GMİM Task verisi güncellendi.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
