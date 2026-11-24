import { describe, expect, it } from 'vitest'
import { examBaremOptions } from './barem'

// Exam categories as they appear on the production "Puan Baremleri" screen (2026-11-24).
const categories = [
  { id: 'meeting', name: 'Toplantı (saat başına ve yoğunluğuna göre)', points: 1 },
  { id: 'maslak-weekday', name: 'Maslak haftaiçi 1 sınav', points: 4 },
  { id: 'maslak-weekend', name: 'Maslak haftasonu 1 sınav', points: 5 },
  { id: 'proficiency', name: 'Tuzla haftaiçi (Yeterlik sınavı)', points: 4 },
  { id: 'tuzla-weekday', name: 'Tuzla haftaiçi 1 sınav', points: 1 },
  { id: 'tuzla-weekday-pool', name: 'Tuzla haftaiçi 1 sınav (havuz dersleri)', points: 2 },
  { id: 'tuzla-after-hours', name: 'Tuzla haftaiçi 1 sınav (mesai dışı)', points: 2 },
  { id: 'tuzla-weekend', name: 'Tuzla haftasonu 1 sınav', points: 2 },
  { id: 'tuzla-weekend-pool', name: 'Tuzla haftasonu 1 sınav (havuz dersleri)', points: 3 },
]

const suggest = (exam: Parameters<typeof examBaremOptions>[1]) => examBaremOptions(categories, exam).suggestedId

describe('examBaremOptions', () => {
  it('lists every exam category and leaves unrelated ones out', () => {
    const { options } = examBaremOptions(categories, { day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'GMI201' })
    expect(options.map((option) => option.id)).not.toContain('meeting')
    expect(options).toHaveLength(8)
  })

  it('defaults to Tuzla weekday for a normal weekday exam', () => {
    expect(suggest({ day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'GMI201', courseName: 'Gemi Makineleri' })).toBe('tuzla-weekday')
  })

  it('picks the pool category for mathematics, physics, chemistry, Turkish and Atatürk courses', () => {
    expect(suggest({ day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'ATA121', courseName: 'Atatürk İlkeleri ve İnkılap Tarihi' })).toBe('tuzla-weekday-pool')
    expect(suggest({ day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'MAT101E', courseName: 'Matematik I' })).toBe('tuzla-weekday-pool')
    expect(suggest({ day: 'Çarşamba', timeSlot: '13:00-15:00', courseCode: 'FIZ101', courseName: 'Fizik' })).toBe('tuzla-weekday-pool')
    expect(suggest({ day: 'Cumartesi', timeSlot: '10:00-12:00', courseCode: 'KIM101E', courseName: 'Kimya' })).toBe('tuzla-weekend-pool')
  })

  it('treats exams starting before 08:30 or from 17:00 on weekdays as after hours', () => {
    expect(suggest({ day: 'Perşembe', timeSlot: '18:00-20:00', courseCode: 'GMI201', courseName: 'Gemi Makineleri' })).toBe('tuzla-after-hours')
    expect(suggest({ day: 'Perşembe', timeSlot: '08:00-10:00', courseCode: 'GMI201' })).toBe('tuzla-after-hours')
    expect(suggest({ day: 'Perşembe', timeSlot: '08:30-10:00', courseCode: 'GMI201' })).toBe('tuzla-weekday')
  })

  it('offers both pool and after-hours categories for an after-hours pool exam', () => {
    const { options } = examBaremOptions(categories, { day: 'Perşembe', timeSlot: '18:00-20:00', courseCode: 'ATA121', courseName: 'Atatürk İlkeleri' })
    expect(options.filter((option) => option.suggested).map((option) => option.id).sort()).toEqual(['tuzla-after-hours', 'tuzla-weekday-pool'])
  })

  it('suggests weekend categories for Saturday and Sunday', () => {
    expect(suggest({ day: 'Pazar', timeSlot: '18:00-20:00', courseCode: 'GMI201' })).toBe('tuzla-weekend')
  })

  it('uses Maslak categories when the exam mentions Maslak', () => {
    expect(suggest({ day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'GMI201', classroom: 'Maslak EEB 1301' })).toBe('maslak-weekday')
    expect(suggest({ day: 'Cumartesi', timeSlot: '10:00-12:00', courseCode: 'GMI201', notes: 'Maslak kampüsü' })).toBe('maslak-weekend')
  })

  it('recognises proficiency exams', () => {
    expect(suggest({ day: 'Salı', timeSlot: '10:00-12:00', courseCode: 'YET', courseName: 'İngilizce Yeterlik Sınavı' })).toBe('proficiency')
  })
})
