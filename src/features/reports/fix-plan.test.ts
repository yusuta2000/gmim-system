import { describe, expect, it } from 'vitest'
import { buildFixPlan } from './fix-plan'
import type { ExamSupervisionReport, ReportTask } from './exam-supervision-report'

const task = (overrides: Partial<ReportTask>): ReportTask => ({
  id: 't', number: 1, description: 'Gözetmenlik', hoursWorked: null, points: 4, status: 'approved', fromCalendar: false, categoryName: null, ...overrides,
})
const empty: ExamSupervisionReport = { checkedTasks: 0, duplicates: [], sameDay: [], mismatches: [] }
const calendarMat = task({ id: 'cal', description: 'Gözetmenlik: MAT101E - Matematik I', fromCalendar: true })
const manualMat = task({ id: 'man', description: 'MAT101E gözetmenlik', points: 2 })

describe('buildFixPlan', () => {
  it('removes the repeated task, keeps the calendar one and counts the lost points', () => {
    const plan = buildFixPlan({
      ...empty,
      duplicates: [{ assistantName: 'Ayşe', day: '2026-10-01', tasks: [calendarMat, manualMat], extraTaskIds: ['man'] }],
    }, '2026-09-01')

    expect(plan.actions).toEqual([expect.objectContaining({ taskId: 'man', kind: 'duplicate', pointChange: -2 })])
    expect(plan.actions[0].steps[1]).toContain('Matematik I')
    expect(plan.people).toEqual([{ assistantName: 'Ayşe', pointChange: -2, actions: 1 }])
  })

  it('does not count points for a repeated task that was never approved', () => {
    const plan = buildFixPlan({
      ...empty,
      duplicates: [{ assistantName: 'Ayşe', day: '2026-10-01', tasks: [calendarMat, { ...manualMat, status: 'pending' }], extraTaskIds: ['man'] }],
    }, '2026-09-01')

    expect(plan.actions[0].pointChange).toBe(0)
  })

  it('fixes wrong barem points and skips tasks already removed as duplicates', () => {
    const exam = { courseCode: 'MAT101E', courseName: 'Matematik I', day: 'Salı', timeSlot: '10:00-12:00' }
    const plan = buildFixPlan({
      ...empty,
      duplicates: [{ assistantName: 'Ayşe', day: '2026-10-01', tasks: [calendarMat, manualMat], extraTaskIds: ['man'] }],
      mismatches: [
        { assistantName: 'Ayşe', day: '2026-10-01', task: calendarMat, exam, suggested: { name: 'Tuzla haftaiçi 1 sınav (havuz dersleri)', points: 2 } },
        { assistantName: 'Ayşe', day: '2026-10-01', task: manualMat, exam, suggested: { name: 'X', points: 1 } },
        { assistantName: 'Mehmet', day: '2026-10-02', task: task({ id: 'pend', status: 'assigned', fromCalendar: true }), exam, suggested: { name: 'Y', points: 1 } },
      ],
    }, '2026-09-01')

    expect(plan.actions.map((action) => [action.taskId, action.kind, action.pointChange])).toEqual([
      ['man', 'duplicate', -2],
      ['cal', 'wrongPoints', -2],
      ['pend', 'wrongPointsPending', 0],
    ])
    expect(plan.people).toEqual([
      { assistantName: 'Ayşe', pointChange: -4, actions: 2 },
      { assistantName: 'Mehmet', pointChange: 0, actions: 1 },
    ])
  })

  it('ignores anything before the start date', () => {
    const plan = buildFixPlan({
      ...empty,
      duplicates: [{ assistantName: 'Ayşe', day: '2026-08-31', tasks: [calendarMat, manualMat], extraTaskIds: ['man'] }],
    }, '2026-09-01')

    expect(plan.actions).toHaveLength(0)
  })
})
