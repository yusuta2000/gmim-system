import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { matchSheetsToAssistants, parseSheetTasks } from '../workbook-sync'

function sheet(aoa: unknown[][]) {
  return XLSX.utils.aoa_to_sheet(aoa)
}

describe('parseSheetTasks', () => {
  it('sayı/tarih/puan kurallarını uygular ve boş tarihi komşuya taşır', () => {
    const ws = sheet([
      ['Sayı', 'Görev', 'Çalışılan saat', 'Tarih', 'Puan'],
      [1, 'A', '', '10.01.2025', 3],
      [2, 'B tarih yok', '', '', 5],
      ['', 'C sayı/tarih yok, puan var', '', '', 10],
      ['TOPLAM', '', '', '', 18],
    ])
    const tasks = parseSheetTasks(ws)
    expect(tasks).toHaveLength(3)
    expect(tasks.reduce((s, t) => s + t.points, 0)).toBe(18)
    // C satırı numarasız → sıralı numara verilir
    expect(tasks[2].number).toBe(3)
    // boş tarihler bir önceki tarihe taşınır
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    expect(iso(tasks[0].date)).toBe('2025-01-10')
    expect(iso(tasks[1].date)).toBe('2025-01-10')
    expect(iso(tasks[2].date)).toBe('2025-01-10')
  })

  it('başlık satırı ilk satırda değilse de bulur', () => {
    const ws = sheet([
      ['Fatih NACAR görevleri'],
      ['Sayı', 'Görev', 'Çalışılan saat', 'Tarih', 'Puan'],
      [1, 'X', '', '01.02.2025', 4],
    ])
    const tasks = parseSheetTasks(ws)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].description).toBe('X')
  })
})

describe('matchSheetsToAssistants', () => {
  it('kişi sayfalarını eşleştirir, meta sayfaları atlar, isim farkını substring ile yakalar', () => {
    const taskHeader = ['Sayı', 'Görev', 'Çalışılan saat', 'Tarih', 'Puan']
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet([['TOPLAM', 'Sıralama']]), 'TOPLAM')
    XLSX.utils.book_append_sheet(wb, sheet([taskHeader, [1, 'g', '', '01.01.2025', 2]]), 'Fatih NACAR')
    XLSX.utils.book_append_sheet(wb, sheet([taskHeader, [1, 'g', '', '01.01.2025', 1]]), 'Berkehan İNAL')
    XLSX.utils.book_append_sheet(wb, sheet([taskHeader, [1, 'g', '', '01.01.2025', 3]]), 'Yeni Kişi')

    const assistants = [
      { id: 'a1', name: 'Fatih NACAR', totalPoints: 0, isActive: true },
      { id: 'a2', name: 'Ö. Berkehan İnal', totalPoints: 0, isActive: true },
      { id: 'a3', name: 'Cenk KAYA', totalPoints: 0, isActive: true },
    ]
    const { matched, unmatchedSheets, unmatchedPersonSheets } = matchSheetsToAssistants(wb, assistants)
    expect(matched.map((m) => m.assistant.id).sort()).toEqual(['a1', 'a2'])
    // Meta sayfa (başlıksız) atlandı; kişi-benzeri ama hesabı olmayan sayfa ayrı uyarıya düştü
    expect(unmatchedSheets).toContain('TOPLAM')
    expect(unmatchedPersonSheets).toEqual(['Yeni Kişi'])
    // Berkehan sayfası, adı farklı olan kişiye substring ile eşleşti
    const berkehan = matched.find((m) => m.sheet === 'Berkehan İNAL')
    expect(berkehan?.assistant.id).toBe('a2')
  })
})
