import { PrismaClient } from '@prisma/client';
import { seedPasswordHash } from './lib/seed-passwords';

const prisma = new PrismaClient();

async function main() {
  // Every assistant receives an environment-provided password hash.
  const passwordUpdates = [
    { email: 'doganaybe@itu.edu.tr', role: 'admin' },
    { email: 'ymutlu@itu.edu.tr', role: 'admin' },
    { email: 'nacar16@itu.edu.tr', role: 'user' },
    { email: 'sbicen@itu.edu.tr', role: 'user' },
    { email: 'gulme@itu.edu.tr', role: 'user' },
    { email: 'coskunm19@itu.edu.tr', role: 'user' },
    { email: 'gulmezr@itu.edu.tr', role: 'user' },
    { email: 'orhanm17@itu.edu.tr', role: 'user' },
    { email: 'cenkkaya@itu.edu.tr', role: 'user' },
    { email: 'inalo@itu.edu.tr', role: 'user' },
  ];

  for (const u of passwordUpdates) {
    const result = await prisma.researchAssistant.updateMany({
      where: { email: u.email },
      data: { password: null, passwordHash: await seedPasswordHash(u.email), role: u.role },
    });
    console.log(`${u.email} → ${u.role} (updated: ${result.count})`);
  }

  // Verify all assistants have password hashes without exposing them.
  const assistants = await prisma.researchAssistant.findMany({
    select: { name: true, email: true, role: true, passwordHash: true },
    orderBy: { order: 'asc' },
  });

  console.log('\n=== Kullanıcı Hesapları ===');
  for (const a of assistants) {
    console.log(`${a.name} | ${a.email} | ${a.role} | hash: ${a.passwordHash ? 'hazır' : 'eksik'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
