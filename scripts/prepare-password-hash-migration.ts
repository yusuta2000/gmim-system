import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const shouldCommit = process.argv.includes('--commit')

if (shouldCommit && (process.env.NODE_ENV === 'production' || process.env.ALLOW_PASSWORD_HASH_MIGRATION !== 'yes')) {
  throw new Error('Refusing password hash migration without a non-production environment and ALLOW_PASSWORD_HASH_MIGRATION=yes')
}

const db = new PrismaClient()

async function main() {
  const [activeAccounts, missingHashes, alreadyHashed] = await Promise.all([
    db.researchAssistant.count({ where: { isActive: true } }),
    db.researchAssistant.count({ where: { passwordHash: null } }),
    db.researchAssistant.count({ where: { passwordHash: { not: null } } }),
  ])

  console.log(JSON.stringify({ activeAccounts, missingHashes, alreadyHashed }))

  if (!shouldCommit) return

  const users = await db.researchAssistant.findMany({
    where: { passwordHash: null, password: { not: null } },
    select: { id: true, password: true },
  })

  const updates = await Promise.all(users.map(async ({ id, password }) => ({
    id,
    passwordHash: await hashPassword(password!),
  })))

  await db.$transaction(updates.map(({ id, passwordHash }) =>
    db.researchAssistant.update({
      where: { id },
      data: { passwordHash },
    }),
  ))

  console.log(JSON.stringify({ migratedAccounts: users.length }))
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Password hash migration failed')
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
