import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {}
  return { requireSession: vi.fn(), UnauthenticatedError }
})
vi.mock('@/features/reports/server/load-report', () => ({ isFixPlanOwner: vi.fn(), loadExamSupervisionReport: vi.fn() }))
vi.mock('@/features/tasks/server/task-service', () => ({ deleteTask: vi.fn(), correctTaskPoints: vi.fn() }))

import { requireSession } from '@/lib/auth/session'
import { isFixPlanOwner, loadExamSupervisionReport } from '@/features/reports/server/load-report'
import { correctTaskPoints, deleteTask } from '@/features/tasks/server/task-service'
import { TaskServiceError } from '@/features/tasks/server/errors'
import type { ReportTask } from '@/features/reports/exam-supervision-report'
import { POST } from './route'

const fn = (value: unknown) => value as ReturnType<typeof vi.fn>
const user = { id: 'tarik', role: 'admin', department: 'GMIM', name: 'Y.Tarık MUTLU' }
const task = (overrides: Partial<ReportTask>): ReportTask => ({
  id: 't', number: 1, description: 'Gözetmenlik', hoursWorked: null, points: 4, status: 'approved', fromCalendar: true, categoryName: null, ...overrides,
})
const exam = { courseCode: 'MAT101E', courseName: 'Matematik I', day: 'Salı', timeSlot: '10:00-12:00' }
const report = {
  checkedTasks: 3,
  sameDay: [],
  duplicates: [{ assistantName: 'Ayşe', day: '2026-10-01', tasks: [task({ id: 'cal' }), task({ id: 'man', fromCalendar: false })], extraTaskIds: ['man'] }],
  mismatches: [{ assistantName: 'Mehmet', day: '2026-10-02', task: task({ id: 'wrong' }), exam, suggested: { id: 'pool', name: 'Havuz', points: 2 } }],
}
const post = (body: unknown) => POST(new Request('http://localhost/api/reports/fix-plan/apply', { method: 'POST', body: JSON.stringify(body) }))

describe('POST /api/reports/fix-plan/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fn(requireSession).mockResolvedValue(user)
    fn(isFixPlanOwner).mockResolvedValue(true)
    fn(loadExamSupervisionReport).mockResolvedValue(report)
  })

  it('looks like a missing page to other accounts and changes nothing', async () => {
    fn(isFixPlanOwner).mockResolvedValue(false)

    expect((await post({ taskIds: ['man'] })).status).toBe(404)
    expect(deleteTask).not.toHaveBeenCalled()
    expect(correctTaskPoints).not.toHaveBeenCalled()
  })

  it('applies only the selected rows that are still in the recomputed plan', async () => {
    const response = await post({ taskIds: ['man', 'wrong', 'gone'] })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(deleteTask).toHaveBeenCalledWith({ taskId: 'man', requester: user })
    expect(correctTaskPoints).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'wrong', expectedPoints: 4, points: 2, categoryId: 'pool', requester: user }))
    expect(body.applied).toEqual(['man', 'wrong'])
    expect(body.skipped).toEqual([{ taskId: 'gone', reason: 'Artık listede yok' }])
  })

  it('skips a row that cannot be changed and continues with the rest', async () => {
    fn(deleteTask).mockRejectedValue(new TaskServiceError('CONFLICT', 'Kapalı dönemde görev değişikliği yapılamaz'))

    const body = await (await post({ taskIds: ['man', 'wrong'] })).json()

    expect(body.applied).toEqual(['wrong'])
    expect(body.skipped).toEqual([{ taskId: 'man', reason: 'Kapalı dönemde görev değişikliği yapılamaz' }])
  })

  it('requires at least one selected row', async () => {
    expect((await post({ taskIds: [] })).status).toBe(400)
  })
})
