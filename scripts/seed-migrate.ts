import { PrismaClient } from '@prisma/client';
import { seedPasswordHash } from './lib/seed-passwords';

const prisma = new PrismaClient();

async function main() {
  // Update existing assistants with roles and hashed passwords.
  const updates = [
    { email: 'ymutlu@itu.edu.tr', role: 'admin' },
    { email: 'doganaybe@itu.edu.tr', role: 'admin' },
  ];

  for (const u of updates) {
    await prisma.researchAssistant.updateMany({
      where: { email: u.email },
      data: { role: u.role, password: null, passwordHash: await seedPasswordHash(u.email) },
    });
  }

  const usersWithoutHashes = await prisma.researchAssistant.findMany({
    where: { role: 'user', passwordHash: null },
    select: { id: true, email: true },
  });
  for (const user of usersWithoutHashes) {
    await prisma.researchAssistant.update({
      where: { id: user.id },
      data: { password: null, passwordHash: await seedPasswordHash(user.email) },
    });
  }

  // Seed weekly schedules
  const assistants = await prisma.researchAssistant.findMany();
  
  const scheduleData: { name: string; schedules: { dayOfWeek: number; timeSlot: string; description: string }[] }[] = [
    { name: 'Begüm DOGANAY', schedules: [
      { dayOfWeek: 3, timeSlot: '10:00-12:00', description: 'GMIM Lisansüstü' },
    ]},
    { name: 'Fatih NACAR', schedules: [
      { dayOfWeek: 1, timeSlot: '08:30-17:30', description: 'Atölye' },
      { dayOfWeek: 3, timeSlot: '13:30-15:30', description: 'Malzeme Bilgisi' },
    ]},
    { name: 'Merve GÜL ÇIVGIN', schedules: [
      { dayOfWeek: 3, timeSlot: '10:00-12:00', description: 'GMIM Lisansüstü' },
    ]},
    { name: 'Sinan COŞKUN', schedules: [
      { dayOfWeek: 2, timeSlot: '09:00-12:00', description: 'Lab' },
      { dayOfWeek: 4, timeSlot: '13:00-16:00', description: 'Lab' },
    ]},
    { name: 'Rukiye GÜLMEZ', schedules: [
      { dayOfWeek: 1, timeSlot: '10:00-12:00', description: 'Araştırma' },
      { dayOfWeek: 3, timeSlot: '14:00-16:00', description: 'Seminer' },
    ]},
  ];

  for (const sd of scheduleData) {
    const assistant = assistants.find(a => a.name === sd.name);
    if (assistant) {
      for (const sched of sd.schedules) {
        await prisma.weeklySchedule.upsert({
          where: { id: `${assistant.id}-${sched.dayOfWeek}-${sched.timeSlot}` },
          update: {},
          create: {
            dayOfWeek: sched.dayOfWeek,
            timeSlot: sched.timeSlot,
            description: sched.description,
            assistantId: assistant.id,
          },
        });
      }
    }
  }

  // Seed some notifications
  const tarik = assistants.find(a => a.email === 'ymutlu@itu.edu.tr');
  if (tarik) {
    await prisma.notification.create({
      data: {
        title: 'Sisteme Hoş Geldiniz!',
        message: 'GMIM Ar.Gör Yönetim Sistemi aktiftir. Yeni görevler ve sınav atamaları bu sistem üzerinden yapılacaktır.',
        type: 'info',
        assistantId: tarik.id,
      },
    });
    await prisma.notification.create({
      data: {
        title: 'Gözetmen Ataması',
        message: 'GMI201 - Gemi Makineleri sınavına gözetmen olarak atandınız. Tarih: 20.05.2026',
        type: 'exam_assigned',
        assistantId: tarik.id,
      },
    });
  }

  console.log('Migration seed completed!');
  console.log('- Roles and password hashes updated');
  console.log('- Weekly schedules seeded');
  console.log('- Notifications seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
