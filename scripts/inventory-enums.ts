import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function distinct(model: 'researchAssistant' | 'task' | 'exam' | 'announcement', field: string) {
  return prisma.$queryRawUnsafe<Array<{ value: string; count: bigint }>>(
    `SELECT "${field}" AS value, COUNT(*) AS count FROM "${model === 'researchAssistant' ? 'ResearchAssistant' : model === 'task' ? 'Task' : model === 'exam' ? 'Exam' : 'Announcement'}" GROUP BY "${field}" ORDER BY "${field}"`,
  )
}

async function main() {
  const [departments, roles, statuses, sources, duplicateSupervisors] = await Promise.all([
    distinct('researchAssistant', 'department'),
    distinct('researchAssistant', 'role'),
    distinct('task', 'status'),
    distinct('task', 'source'),
    prisma.$queryRaw<Array<{ examId: string; assistantId: string; count: bigint }>>`
      SELECT "examId", "assistantId", COUNT(*) AS count
      FROM "ExamSupervisor"
      GROUP BY "examId", "assistantId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `,
  ])

  console.log(JSON.stringify({
    mode: 'dry-run',
    enumInventory: {
      researchAssistantDepartment: departments.map((row) => ({ ...row, count: Number(row.count) })),
      researchAssistantRole: roles.map((row) => ({ ...row, count: Number(row.count) })),
      taskStatus: statuses.map((row) => ({ ...row, count: Number(row.count) })),
      taskSource: sources.map((row) => ({ ...row, count: Number(row.count) })),
    },
    duplicateExamSupervisors: duplicateSupervisors.map((row) => ({ ...row, count: Number(row.count) })),
    nextStep: duplicateSupervisors.length > 0
      ? 'Resolve duplicate ExamSupervisor rows before applying the unique constraint.'
      : 'No duplicate ExamSupervisor rows detected by this dry-run.',
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
