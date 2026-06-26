import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing schedules
  await prisma.weeklySchedule.deleteMany({});

  const assistants = await prisma.researchAssistant.findMany();

  const scheduleData = [
    { name: 'Begüm DOGANAY', dayOfWeek: 3, timeSlot: '10:00-12:00', description: 'GMIM Lisansüstü' },
    { name: 'Fatih NACAR', dayOfWeek: 1, timeSlot: '08:30-17:30', description: 'Atölye' },
    { name: 'Fatih NACAR', dayOfWeek: 3, timeSlot: '13:30-15:30', description: 'Malzeme Bilgisi' },
    { name: 'Merve GÜL ÇIVGIN', dayOfWeek: 3, timeSlot: '10:00-12:00', description: 'GMIM Lisansüstü' },
    { name: 'Sinan COŞKUN', dayOfWeek: 2, timeSlot: '09:00-12:00', description: 'Lab' },
    { name: 'Sinan COŞKUN', dayOfWeek: 4, timeSlot: '13:00-16:00', description: 'Lab' },
    { name: 'Rukiye GÜLMEZ', dayOfWeek: 1, timeSlot: '10:00-12:00', description: 'Araştırma' },
    { name: 'Rukiye GÜLMEZ', dayOfWeek: 3, timeSlot: '14:00-16:00', description: 'Seminer' },
  ];

  for (const sd of scheduleData) {
    const assistant = assistants.find(a => a.name === sd.name);
    if (assistant) {
      await prisma.weeklySchedule.create({
        data: {
          dayOfWeek: sd.dayOfWeek,
          timeSlot: sd.timeSlot,
          description: sd.description,
          assistantId: assistant.id,
        },
      });
    }
  }

  console.log('Schedule data restored!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
