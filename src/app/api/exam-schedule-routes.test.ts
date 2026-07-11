import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    exam: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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
    },
    pointCategory: {
      findFirst: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}))

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
import { GET as getExams, POST as createExam } from '@/app/api/exams/route'
import { GET as getSchedules, POST as createSchedule, DELETE as deleteSchedule } from '@/app/api/weekly-schedule/route'
import { POST as assignSupervisors } from '@/app/api/supervisor-assign/route'
import type { SessionUser } from '@/lib/auth/session-repository'

const exam = db.exam as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
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
const examSupervisor = db.examSupervisor as unknown as { create: ReturnType<typeof vi.fn> }
const pointCategory = db.pointCategory as unknown as { findFirst: ReturnType<typeof vi.fn> }
const task = db.task as unknown as { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
const notification = db.notification as unknown as { create: ReturnType<typeof vi.fn> }
const requireSessionMock = requireSession as unknown as ReturnType<typeof vi.fn>

const adminUser: SessionUser = { id: 'admin-1', role: 'admin', department: 'GMIM' }
const regularUser: SessionUser = { id: 'user-1', role: 'user', department: 'GMIM' }
const assistant = { id: 'assistant-1', name: 'Assistant', department: 'GMIM', totalPoints: 0 }
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
    task.findFirst.mockResolvedValue({ number: 2 })
    task.create.mockResolvedValue({})
    notification.create.mockResolvedValue({})
  })

  it('GET routes require a session and department access', async () => {
    requireSessionMock.mockRejectedValue(new UnauthenticatedError())
    expect((await getExams(new Request('http://localhost/api/exams?department=GMIM'))).status).toBe(401)

    requireSessionMock.mockResolvedValue(adminUser)
    expect((await getSchedules(new Request('http://localhost/api/weekly-schedule?department=DUIM'))).status).toBe(403)
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

  it('supervisor assignment creates assignments for an authorized exam', async () => {
    const response = await assignSupervisors(jsonRequest('/api/supervisor-assign', { examId: 'exam-1' }))

    expect(response.status).toBe(200)
    expect(examSupervisor.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { examId: 'exam-1', assistantId: 'assistant-1' },
    }))
    expect(researchAssistant.update).toHaveBeenCalledWith({
      where: { id: 'assistant-1' },
      data: { totalPoints: { increment: 4 } },
    })
  })
})
