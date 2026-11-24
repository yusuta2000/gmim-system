import { describe, expect, it } from 'vitest'
import { buildExamSupervisionReport } from './exam-supervision-report'

const categories = [
  { id: 'weekday', name: 'Tuzla haftaiçi 1 sınav', points: 1 },
  { id: 'pool', name: 'Tuzla haftaiçi 1 sınav (havuz dersleri)', points: 2 },
]
const assistants = [{ id: 'a1', name: 'Ayşe' }, { id: 'a2', name: 'Mehmet' }]
const exams = [{ id: 'exam-mat', courseCode: 'MAT101E', courseName: 'Matematik I', day: 'Salı', timeSlot: '10:00-12:00' }]
const task = (overrides: Partial<Parameters<typeof buildExamSupervisionReport>[0]['tasks'][number]>) => ({
  id: 't', number: 1, assistantId: 'a1', description: '', date: new Date('2026-11-10T00:00:00Z'),
  hoursWorked: null, points: 4, status: 'approved', notes: null, category: null, ...overrides,
})

describe('buildExamSupervisionReport', () => {
  it('flags the same course entered from Tasks and from the calendar on the same day', () => {
    const report = buildExamSupervisionReport({
      assistants, exams, categories,
      tasks: [
        task({ id: 'manual', description: 'MAT101E sınav gözetmenliği' }),
        task({ id: 'calendar', description: 'Gözetmenlik: MAT101E - Matematik I', notes: '[SINAV] exam-mat' }),
      ],
    })

    expect(report.duplicates).toHaveLength(1)
    expect(report.duplicates[0]).toMatchObject({ assistantName: 'Ayşe', day: '2026-11-10' })
    expect(report.duplicates[0].tasks.map((item) => item.fromCalendar)).toEqual([true, false])
    expect(report.duplicates[0].extraTaskIds).toEqual(['manual'])
    expect(report.sameDay).toHaveLength(0)
  })

  it('lists different exams on the same day separately as information', () => {
    const report = buildExamSupervisionReport({
      assistants, exams, categories,
      tasks: [task({ id: 'x', description: 'FIZ101 gözetmenlik' }), task({ id: 'y', description: 'KIM101 gözetmenlik' })],
    })

    expect(report.duplicates).toHaveLength(0)
    expect(report.sameDay).toHaveLength(1)
  })

  it('compares calendar duties with the barem suggestion and ignores unrelated tasks', () => {
    const report = buildExamSupervisionReport({
      assistants, exams, categories,
      tasks: [
        task({ id: 'calendar', assistantId: 'a2', description: 'Gözetmenlik: MAT101E - Matematik I', notes: '[SINAV] exam-mat', points: 4 }),
        task({ id: 'meeting', description: 'Bölüm toplantısı', points: 1 }),
      ],
    })

    expect(report.checkedTasks).toBe(1)
    expect(report.mismatches).toEqual([expect.objectContaining({
      assistantName: 'Mehmet',
      suggested: { id: 'pool', name: 'Tuzla haftaiçi 1 sınav (havuz dersleri)', points: 2 },
      task: expect.objectContaining({ points: 4 }),
    })])
  })
})
