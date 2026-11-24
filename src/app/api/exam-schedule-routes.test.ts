import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => {
  const db = {
    exam: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    weeklySchedule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    researchAssistant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    examSupervisor: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    pointCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db))
  return { db }
})

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }))

vi.mock('@/lib/auth/session', () => {
  class UnauthenticatedError extends Error {
    constructor() {
      super('UNAUTHENTICATED')
    }
  }

  return {
    requireSession: vi.fn(),
    UnauthenticatedError,
  }
})

import { db } from '@/lib/db'
import { requireSession, UnauthenticatedError } from '@/lib/auth/session'
import { GET as getExams, POST as createExam, DELETE as deleteExamRoute } from '@/app/api/exams/route'
import { GET as getSchedules, POST as createSchedule, DELETE as deleteSchedule } from '@/app/api/weekly-schedule/route'
import { POST as assignSupervisors } from '@/app/api/supervisor-assign/route'
import { POST as addSupervisor } from '@/app/api/exam-supervisors/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const exam = db.exam as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const weeklySchedule = db.weeklySchedule as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}
const researchAssistant = db.researchAssistant as unknown as {
  findUnique: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}
const examSupervisor = db.examSupervisor as unknown as { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> }
const pointCategory = db.pointCategory as unknown as { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
const task = db.task as unknown as { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> }
const notification = db.notification as unknown as { create: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> }
const baremCategories = [
  { id: 'cat-weekday', name: 'Gözetmenlik (1 sınav)', points: 4 },
  { id: 'cat-weekend', name: 'Haftasonu sınavı', points: 5 },
  { id: 'cat-other', name: 'MÜDEK', points: 4 },
]
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const assistant = { id: 'assistant-1', name: 'Assistant', email: 'assistant@example.com', role: 'user', isActive: true, department: 'GMIM', totalPoints: 0 }
const examRecord = {
  id: 'exam-1',
  department: 'GMIM',
  requiredSupervisors: 1,
  supervisors: [],
  day: 'Pazartesi',
  timeSlot: '10:00-12:00',
  courseCode: 'ABC',
  courseName: 'Course',
  date: new Date('2026-01-01'),
}
const scheduleRecord = {
  id: 'schedule-1',
  assistantId: 'assistant-1',
  dayOfWeek: 1,
  timeSlot: '08:00-09:00',
  assistant,
}

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('exam and schedule routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireSessionMock.mockResolvedValue(adminUser)
    exam.findMany.mockResolvedValue([examRecord])
    exam.findUnique.mockResolvedValue(examRecord)
    exam.create.mockResolvedValue(examRecord)
    weeklySchedule.findMany.mockResolvedValue([])
    weeklySchedule.findUnique.mockResolvedValue(scheduleRecord)
    weeklySchedule.create.mockResolvedValue(scheduleRecord)
    weeklySchedule.delete.mockResolvedValue({})
    researchAssistant.findUnique.mockResolvedValue(assistant)
    researchAssistant.findMany.mockResolvedValue([assistant])
    researchAssistant.update.mockResolvedValue({})
    examSupervisor.create.mockResolvedValue({ id: 'assignment-1', assistant })
    pointCategory.findFirst.mockResolvedValue({ id: 'cat-1', points: 4 })
    pointCategory.findMany.mockResolvedValue(baremCategories)
    task.findFirst.mockResolvedValue({ number: 2 })
    task.findMany.mockResolvedValue([])
    task.create.mockResolvedValue({})
    notification.create.mockResolvedValue({})
  })

  it('GET routes require a session and department access', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())
    expect((await getExams(new Request('http://localhost/api/exams?department=GMIM'))).status).toBe(401)

    requireSessionMock.mockResolvedValue(adminUser)
    expect((await getSchedules(new Request('http://localhost/api/weekly-schedule?department=DUIM'))).status).toBe(403)
  })

  it('exam GET uses an explicit safe DTO projection', async () => {
    const response = await getExams(new Request('http://localhost/api/exams?department=GMIM'))

    expect(response.status).toBe(200)
    expect(exam.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { department: 'GMIM' },
      select: expect.objectContaining({
        id: true,
        courseCode: true,
        supervisors: {
          select: {
            id: true,
            assistantId: true,
            assistant: { select: { id: true, name: true } },
          },
        },
      }),
    }))
    expect(exam.findMany.mock.calls[0][0]).not.toHaveProperty('include')
  })

  it('weekly-schedule GET limits regular users to their own safe DTO rows', async () => {
    requireSessionMock.mockResolvedValue(regularUser)

    const response = await getSchedules(new Request('http://localhost/api/weekly-schedule?department=GMIM'))

    expect(response.status).toBe(200)
    expect(weeklySchedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assistantId: 'user-1', assistant: { department: 'GMIM' } },
      select: expect.objectContaining({
        id: true,
        assistant: { select: { id: true, name: true } },
      }),
    }))
    expect(weeklySchedule.findMany.mock.calls[0][0]).not.toHaveProperty('include')
  })

  it('exams POST requires a manager and writes only an authorized department', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    const forbidden = await createExam(jsonRequest('/api/exams', { department: 'GMIM' }))
    expect(forbidden.status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    const crossDepartment = await createExam(jsonRequest('/api/exams', { department: 'DUIM' }))
    expect(crossDepartment.status).toBe(403)

    const response = await createExam(jsonRequest('/api/exams', {
      courseCode: 'ABC',
      courseName: 'Course',
      instructor: 'Instructor',
      date: '2026-01-01',
      day: 'Pazartesi',
      timeSlot: '10:00-12:00',
      department: 'GMIM',
    }))
    expect(response.status).toBe(201)
    expect(exam.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ department: 'GMIM' }),
    }))
  })

  it('weekly-schedule POST requires manager access to the target assistant department', async () => {
    researchAssistant.findUnique.mockResolvedValue({ ...assistant, department: 'DUIM' })

    const response = await createSchedule(jsonRequest('/api/weekly-schedule', {
      assistantId: 'assistant-1',
      dayOfWeek: 1,
      timeSlot: '10:00-12:00',
      description: 'Office',
    }))

    expect(response.status).toBe(403)
    expect(weeklySchedule.create).not.toHaveBeenCalled()
  })

  it('weekly-schedule DELETE requires manager access to the schedule assistant department', async () => {
    weeklySchedule.findUnique.mockResolvedValue({
      ...scheduleRecord,
      assistant: { ...assistant, department: 'DUIM' },
    })

    const response = await deleteSchedule(new Request('http://localhost/api/weekly-schedule?id=schedule-1'))

    expect(response.status).toBe(403)
    expect(weeklySchedule.delete).not.toHaveBeenCalled()
  })

  it('supervisor assignment requires manager access to the exam department', async () => {
    exam.findUnique.mockResolvedValue({ ...examRecord, department: 'DUIM' })

    const response = await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(response.status).toBe(403)
    expect(examSupervisor.create).not.toHaveBeenCalled()
  })

  it('supervisor assignment waits for the assistant to accept before adding points', async () => {
    const response = await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(response.status).toBe(200)
    expect(examSupervisor.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { examId: 'exam-1', assistantId: 'assistant-1' },
    }))
    expect(task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ assistantId: 'assistant-1', status: 'assigned', points: 4, notes: '[SINAV] exam-1' }),
    })
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it('supervisor assignment does not pick someone who declined this exam', async () => {
    task.findMany.mockResolvedValue([{ assistantId: 'assistant-1' }])

    await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(examSupervisor.create).not.toHaveBeenCalled()
  })

  it('exam GET reports each supervisor status and who declined', async () => {
    exam.findMany.mockResolvedValue([{
      ...examRecord,
      supervisors: [{ id: 's-1', assistantId: 'assistant-1', assistant: { id: 'assistant-1', name: 'Assistant' } }],
    }])
    task.findMany.mockResolvedValue([
      { assistantId: 'assistant-1', status: 'assigned', notes: '[SINAV] exam-1', assistant: { id: 'assistant-1', name: 'Assistant' } },
      { assistantId: 'assistant-2', status: 'rejected', notes: '[SINAV] exam-1\n\n[RET_SEBEBI]\nRaporluyum', assistant: { id: 'assistant-2', name: 'Other' } },
    ])

    const data = await (await getExams(new Request('http://localhost/api/exams?department=GMIM'))).json()

    expect(data[0].supervisors[0]).toMatchObject({ assistantId: 'assistant-1', status: 'pending' })
    expect(data[0].declined).toEqual([{ id: 'assistant-2', name: 'Other' }])
  })

  it('managers can add a chosen supervisor, pending acceptance', async () => {
    const response = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1' }))

    expect(response.status).toBe(201)
    expect(examSupervisor.create).toHaveBeenCalledWith(expect.objectContaining({ data: { examId: 'exam-1', assistantId: 'assistant-1' } }))
    expect(task.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'assigned', notes: '[SINAV] exam-1' }) })
    expect(researchAssistant.update).not.toHaveBeenCalled()
  })

  it('manual supervisor add rejects assistants and other-department people', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    expect((await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1' }))).status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    researchAssistant.findUnique.mockResolvedValue({ ...assistant, department: 'DUIM' })
    expect((await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1' }))).status).toBe(400)
    expect(examSupervisor.create).not.toHaveBeenCalled()
  })

  it('supervisor points come from the chosen barem, not the first matching category', async () => {
    const response = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1', categoryId: 'cat-weekend' }))

    expect(response.status).toBe(201)
    expect(task.create).toHaveBeenCalledWith({ data: expect.objectContaining({ points: 5, categoryId: 'cat-weekend' }) })
  })

  it('without a chosen barem, a weekend exam gets the weekend category', async () => {
    exam.findUnique.mockResolvedValue({ ...examRecord, day: 'Cumartesi' })

    await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(task.create).toHaveBeenCalledWith({ data: expect.objectContaining({ points: 5, categoryId: 'cat-weekend' }) })
  })

  it('an unknown barem is rejected', async () => {
    const response = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1', categoryId: 'missing' }))

    expect(response.status).toBe(400)
    expect(task.create).not.toHaveBeenCalled()
  })

  it('asks for confirmation when the person already has an exam that day, then assigns on confirm', async () => {
    task.findMany.mockResolvedValue([{ assistantId: 'assistant-1', description: 'Gözetmenlik: FIZ101 - Fizik', hoursWorked: '13:00-15:00', notes: '[SINAV] exam-9', category: null }])

    const first = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1', categoryId: 'cat-weekday' }))
    expect(first.status).toBe(409)
    const body = await first.json()
    expect(body).toMatchObject({ error: 'CONFIRM_REQUIRED', sameCourse: false })
    expect(body.message).toContain('2. sınavı')
    expect(examSupervisor.create).not.toHaveBeenCalled()

    const confirmed = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1', categoryId: 'cat-weekday', confirm: true }))
    expect(confirmed.status).toBe(201)
  })

  it('flags the same course on the same day as a likely double entry', async () => {
    task.findMany.mockResolvedValue([{ assistantId: 'assistant-1', description: 'ABC sınav gözetmenliği', hoursWorked: null, notes: null, category: null }])

    const response = await addSupervisor(jsonRequest('/api/exam-supervisors', { examId: 'exam-1', assistantId: 'assistant-1' }))

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ sameCourse: true })
  })

  it('auto assignment skips someone who already has the same course that day', async () => {
    task.findMany.mockResolvedValue([{ assistantId: 'assistant-1', description: 'ABC gözetmenlik', hoursWorked: null, notes: null, category: null }])

    await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(examSupervisor.create).not.toHaveBeenCalled()
  })

  it('deleting an exam removes pending duties but keeps accepted ones and their points', async () => {
    task.findMany.mockResolvedValue([
      { id: 't-pending', assistantId: 'assistant-1', status: 'assigned', notes: '[SINAV] exam-1' },
      { id: 't-accepted', assistantId: 'assistant-2', status: 'approved', notes: '[SINAV] exam-1' },
      { id: 't-other', assistantId: 'assistant-3', status: 'assigned', notes: '[SINAV] exam-10' },
    ])

    const response = await deleteExamRoute(new Request('http://localhost/api/exams?id=exam-1', { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ removedPending: 1, keptAccepted: 1 })
    expect(task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['t-pending'] }, status: 'assigned' } })
    expect(researchAssistant.update).not.toHaveBeenCalled()
    expect(examSupervisor.deleteMany).toHaveBeenCalledWith({ where: { examId: 'exam-1' } })
    expect(exam.delete).toHaveBeenCalledWith({ where: { id: 'exam-1' } })
  })

  it('exam DELETE requires a manager of the exam department', async () => {
    requireSessionMock.mockResolvedValue(regularUser)
    expect((await deleteExamRoute(new Request('http://localhost/api/exams?id=exam-1', { method: 'DELETE' }))).status).toBe(403)

    requireSessionMock.mockResolvedValue(adminUser)
    exam.findUnique.mockResolvedValue({ ...examRecord, department: 'DUIM' })
    expect((await deleteExamRoute(new Request('http://localhost/api/exams?id=exam-1', { method: 'DELETE' }))).status).toBe(403)
    expect(exam.delete).not.toHaveBeenCalled()
  })
})
