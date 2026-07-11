import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const commit = process.argv.includes('--commit')

function periodName(date: Date, department: string) {
  return `${department}-${date.getFullYear()}-${date.getMonth() < 6 ? 'spring' : 'fall'}`
}

function periodStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() < 6 ? 0 : 6, 1))
}

async function main() {
  const tasks = await prisma.task.findMany({
    select: { id: true, date: true, assistant: { select: { department: true } } },
    orderBy: { date: 'asc' },
  })

  const plan = tasks.map((task) => ({
    taskId: task.id,
    department: task.assistant.department,
    taskDate: task.date.toISOString(),
    periodName: periodName(task.date, task.assistant.department),
    startsAt: periodStart(task.date).toISOString(),
  }))

  console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', plannedTaskMappings: plan }, null, 2))

  if (!commit) return

  await prisma.$transaction(async (tx) => {
    for (const item of plan) {
      const period = await tx.academicPeriod.upsert({
        where: { department_name: { department: item.department, name: item.periodName } },
        update: {},
        create: {
          department: item.department,
          name: item.periodName,
          startsAt: new Date(item.startsAt),
          status: 'open',
        },
      })
      await tx.$executeRaw`
        UPDATE "Task"
        SET "periodId" = ${period.id}
        WHERE "id" = ${item.taskId}
      `
    }
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
