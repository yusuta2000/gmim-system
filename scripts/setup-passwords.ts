import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Every assistant gets their own unique password based on their name
  const passwordUpdates = [
    { email: 'doganaybe@itu.edu.tr', password: 'begum2026', role: 'admin' },
    { email: 'ymutlu@itu.edu.tr', password: 'tarik2026', role: 'admin' },
    { email: 'nacar16@itu.edu.tr', password: 'fatih2026', role: 'user' },
    { email: 'sbicen@itu.edu.tr', password: 'samet2026', role: 'user' },
    { email: 'gulme@itu.edu.tr', password: 'merve2026', role: 'user' },
    { email: 'coskunm19@itu.edu.tr', password: 'sinan2026', role: 'user' },
    { email: 'gulmezr@itu.edu.tr', password: 'rukiye2026', role: 'user' },
    { email: 'orhanm17@itu.edu.tr', password: 'muhittin2026', role: 'user' },
    { email: 'cenkkaya@itu.edu.tr', password: 'cenk2026', role: 'user' },
    { email: 'inalo@itu.edu.tr', password: 'berkehan2026', role: 'user' },
  ];

  for (const u of passwordUpdates) {
    const result = await prisma.researchAssistant.updateMany({
      where: { email: u.email },
      data: { password: u.password, role: u.role },
    });
    console.log(`${u.email} → ${u.role} (updated: ${result.count})`);
  }

  // Verify all assistants have passwords
  const assistants = await prisma.researchAssistant.findMany({
    select: { name: true, email: true, role: true, password: true },
    orderBy: { order: 'asc' },
  });

  console.log('\n=== Kullanıcı Hesapları ===');
  for (const a of assistants) {
    console.log(`${a.name} | ${a.email} | ${a.role} | Şifre: ${a.password}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
