import type { Prisma, Task } from '@prisma/client'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/session-repository'
import { assertDepartmentAccess } from '@/lib/authorization/department'
import { TaskServiceError } from './errors'

type TaskWithAssistant = Prisma.TaskGetPayload<{ include: { assistant: true; category: true } }>
type TaskTransaction = Prisma.TransactionClient

function isManager(user: SessionUser) {
  return user.role === 'admin' || user.role === 'dekan' || user.role === 'baskan'
}

async function getTaskForMutation(client: Pick<TaskTransaction, 'task'>, taskId: string) {
  const task = await client.task.findUnique({
    where: { id: taskId },
    include: { assistant: true, category: true },
  })
  if (!task) {
    throw new TaskServiceError('NOT_FOUND', 'Görev bulunamadı')
  }
  return task
}

function assertTaskDepartment(user: SessionUser, task: TaskWithAssistant) {
  assertDepartmentAccess(user, task.assistant.department as SessionUser['department'])
}

function approvedPoints(task: Pick<Task, 'status' | 'points'>) {
  return task.status === 'approved' && task.points > 0 ? task.points : 0
}

async function assertTaskPeriodOpen(taskId: string, tx: TaskTransaction) {
  const hasPeriodColumn = await tx.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'Task' AND column_name = 'periodId'
    ) AS "exists"
  `
  if (!hasPeriodColumn[0]?.exists) return

  const rows = await tx.$queryRaw<Array<{ status: string | null }>>`
    SELECT p.status
    FROM "Task" t
    LEFT JOIN "AcademicPeriod" p ON p.id = t."periodId"
    WHERE t.id = ${taskId}
    LIMIT 1
  `
  if (rows[0]?.status === 'closed') {
    throw new TaskServiceError('CONFLICT', 'Kapalı dönemde görev değişikliği yapılamaz')
  }
}

export async function approveTask(input: {
  taskId: string
  action: 'approve' | 'reject'
  reviewer: SessionUser
}) {
  if (!isManager(input.reviewer)) {
    throw new TaskServiceError('FORBIDDEN', 'FORBIDDEN')
  }
  if (!['approve', 'reject'].includes(input.action)) {
    throw new TaskServiceError('BAD_REQUEST', 'Action must be "approve" or "reject"')
  }

  return db.$transaction(async (tx) => {
    const task = await getTaskForMutation(tx, input.taskId)
    assertTaskDepartment(input.reviewer, task)
    await assertTaskPeriodOpen(input.taskId, tx)

    const newStatus = input.action === 'approve' ? 'approved' : 'rejected'
    const updated = await tx.task.updateMany({
      where: { id: input.taskId, status: 'pending' },
      data: { status: newStatus, assignedBy: input.reviewer.id },
    })
    if (updated.count !== 1) {
      throw new TaskServiceError('CONFLICT', 'Bu görev zaten işlenmiş')
    }

    if (input.action === 'approve' && task.points > 0) {
      await tx.researchAssistant.update({
        where: { id: task.assistantId },
        data: { totalPoints: { increment: task.points } },
      })
    }

    await tx.notification.create({
      data: {
        title: input.action === 'approve' ? 'Görev Onaylandı' : 'Görev Reddedildi',
        message: input.action === 'approve'
          ? `"${task.description}" göreviniz onaylandı. +${task.points} puan eklendi.`
          : `"${task.description}" göreviniz reddedildi.`,
        type: input.action === 'approve' ? 'success' : 'warning',
        assistantId: task.assistantId,
        relatedId: task.id,
      },
    })

    return tx.task.findUniqueOrThrow({
      where: { id: input.taskId },
      include: { assistant: true, category: true },
    })
  })
}

export async function respondToTask(input: {
  taskId: string
  action: 'accept' | 'reject'
  responder: SessionUser
}) {
  if (!['accept', 'reject'].includes(input.action)) {
    throw new TaskServiceError('BAD_REQUEST', 'Geçersiz işlem')
  }

  return db.$transaction(async (tx) => {
    const task = await getTaskForMutation(tx, input.taskId)
    await assertTaskPeriodOpen(input.taskId, tx)
    if (task.assistantId !== input.responder.id) {
      throw new TaskServiceError('FORBIDDEN', 'Bu göreve yanıt verme yetkiniz yok')
    }

    const newStatus = input.action === 'accept' ? 'approved' : 'rejected'
    const updated = await tx.task.updateMany({
      where: { id: input.taskId, assistantId: input.responder.id, status: 'assigned' },
      data: { status: newStatus },
    })
    if (updated.count !== 1) {
      throw new TaskServiceError('CONFLICT', 'Bu görev zaten yanıtlanmış')
    }

    if (input.action === 'accept' && task.points > 0) {
      await tx.researchAssistant.update({
        where: { id: task.assistantId },
        data: { totalPoints: { increment: task.points } },
      })
    }

    const managers = await tx.researchAssistant.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['admin', 'baskan'] }, department: task.assistant.department },
          { role: 'dekan' },
        ],
      },
    })
    await Promise.all(managers.map((manager) => tx.notification.create({
      data: {
        title: input.action === 'accept' ? 'Görev Kabul Edildi' : 'Görev Reddedildi',
        message: input.action === 'accept'
          ? `${task.assistant.name} "${task.description}" görevini kabul etti. ${task.points} puan eklendi.`
          : `${task.assistant.name} "${task.description}" görevini reddetti. Başka bir araştırma görevlisine atanabilir.`,
        type: input.action === 'accept' ? 'success' : 'warning',
        assistantId: manager.id,
        relatedId: task.id,
      },
    })))

    return tx.task.findUniqueOrThrow({
      where: { id: input.taskId },
      include: { assistant: true, category: true },
    })
  })
}

export async function deleteTask(input: { taskId: string; requester: SessionUser }) {
  if (!isManager(input.requester)) {
    throw new TaskServiceError('FORBIDDEN', 'FORBIDDEN')
  }

  await db.$transaction(async (tx) => {
    const task = await getTaskForMutation(tx, input.taskId)
    assertTaskDepartment(input.requester, task)
    await assertTaskPeriodOpen(input.taskId, tx)

    const pointsToRemove = approvedPoints(task)
    if (pointsToRemove > 0) {
      await tx.researchAssistant.update({
        where: { id: task.assistantId },
        data: { totalPoints: { decrement: pointsToRemove } },
      })
    }

    const deleted = await tx.task.deleteMany({ where: { id: input.taskId } })
    if (deleted.count !== 1) {
      throw new TaskServiceError('CONFLICT', 'Görev silinemedi')
    }

    await tx.notification.create({
      data: {
        title: 'Görev Silindi',
        message: `"${task.description}" göreviniz temsilci tarafından silindi. ${pointsToRemove > 0 ? `${pointsToRemove} puan düşürüldü.` : ''}`,
        type: 'warning',
        assistantId: task.assistantId,
        relatedId: null,
      },
    })
  })
}
