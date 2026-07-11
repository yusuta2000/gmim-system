import type { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

export type SessionUser = {
  id: string
  role: 'admin' | 'baskan' | 'dekan' | 'user'
  department: 'GMIM' | 'DUIM'
}

export type PortalSessionUser = SessionUser & { name: string }

type SessionClient = Pick<PrismaClient, 'session'>

const sessionUserSelect = {
  id: true,
  name: true,
  role: true,
  department: true,
} satisfies Prisma.ResearchAssistantSelect

export function createSessionRepository(client: SessionClient) {
  return {
    createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
      return client.session.create({ data: input })
    },
    async findSessionUser(tokenHash: string, now = new Date()): Promise<PortalSessionUser | null> {
      const session = await client.session.findFirst({
        where: { tokenHash, expiresAt: { gt: now } },
        select: { user: { select: sessionUserSelect } },
      })

      return session?.user as PortalSessionUser | null
    },
    deleteSession(tokenHash: string) {
      return client.session.deleteMany({ where: { tokenHash } })
    },
  }
}

export const sessionRepository = createSessionRepository(db)
