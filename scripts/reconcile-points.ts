import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const assistants = await prisma.researchAssistant.findMany({
    select: {
      id: true,
      name: true,
      department: true,
      totalPoints: true,
      tasks: {
        where: { status: 'approved' },
        select: { points: true },
      },
    },
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
  })

  const mismatches = assistants
    .map((assistant) => {
      const expected = assistant.tasks.reduce((sum, task) => sum + task.points, 0)
      return {
        id: assistant.id,
        name: assistant.name,
        department: assistant.department,
        stored: assistant.totalPoints,
        expected,
        delta: assistant.totalPoints - expected,
      }
    })
    .filter((row) => row.delta !== 0)

  console.log(JSON.stringify({
    mode: 'dry-run',
    checkedAssistants: assistants.length,
    mismatches,
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
