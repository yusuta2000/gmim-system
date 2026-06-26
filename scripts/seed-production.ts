import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Research Assistants
  const assistants = [
    { name: 'Begüm DOGANAY', email: 'doganaybe@itu.edu.tr', phone: '5071432107', totalPoints: 279, order: 1, role: 'admin', password: 'begum2026' },
    { name: 'Y.Tarık MUTLU', email: 'ymutlu@itu.edu.tr', phone: '', totalPoints: 274, order: 2, role: 'admin', password: 'tarik2026' },
    { name: 'Fatih NACAR', email: 'nacar16@itu.edu.tr', phone: '5065813277', totalPoints: 267, order: 3, role: 'user', password: 'fatih2026' },
    { name: 'Samet BİÇEN', email: 'sbicen@itu.edu.tr', phone: '5522087166', totalPoints: 260, order: 4, role: 'user', password: 'samet2026' },
    { name: 'Merve GÜL ÇIVGIN', email: 'gulme@itu.edu.tr', phone: '5425111429', totalPoints: 208, order: 5, role: 'user', password: 'merve2026' },
    { name: 'Sinan COŞKUN', email: 'coskunm19@itu.edu.tr', phone: '5555240033', totalPoints: 200, order: 6, role: 'user', password: 'sinan2026' },
    { name: 'Rukiye GÜLMEZ', email: 'gulmezr@itu.edu.tr', phone: '5070963781', totalPoints: 174, order: 7, role: 'user', password: 'rukiye2026' },
    { name: 'Muhittin ORHAN', email: 'orhanm17@itu.edu.tr', phone: '5545762801', totalPoints: 166, order: 8, role: 'user', password: 'muhittin2026' },
    { name: 'Cenk KAYA', email: 'cenkkaya@itu.edu.tr', phone: '', totalPoints: 33, order: 9, role: 'user', password: 'cenk2026' },
    { name: 'Ö. Berkehan İNAL', email: 'inalo@itu.edu.tr', phone: '', totalPoints: 0, order: 10, role: 'user', password: 'berkehan2026' },
  ];

  const createdAssistants = [];
  for (const a of assistants) {
    const ra = await prisma.researchAssistant.create({ data: a });
    createdAssistants.push(ra);
  }
  console.log(`Created ${createdAssistants.length} assistants`);

  // Seed Point Categories
  const categories = [
    { name: 'MÜDEK', points: 4 },
    { name: 'Ders Programı İşleri (1 saat)', points: 1 },
    { name: 'Ders Programı İşleri (2-3 saat)', points: 2 },
    { name: 'Ders Programı İşleri (4+ saat)', points: 3 },
    { name: 'Maslak haftaiçi 1 sınav', points: 4 },
    { name: 'Maslak haftaici 2 sınav', points: 6 },
    { name: 'Haftasonu sınavı', points: 5 },
    { name: 'Yüksek lisans bitirme tezi (adet)', points: 3 },
    { name: 'Liman Komisyonu', points: 1 },
    { name: 'Not Komisyonu (40-50 kişi)', points: 3 },
    { name: 'Not Komisyonu (max 10 kişi)', points: 2 },
    { name: 'Fakülte Gezisi (1-2 saat)', points: 2 },
    { name: 'Fakülte Gezisi (2 Saat üzeri)', points: 3 },
    { name: 'Tanıtım günleri (Ayazağa-Haftaiçi)', points: 8 },
    { name: 'Tanıtım günleri (Fakülte-Haftaiçi)', points: 6 },
    { name: 'Tanıtım günleri (Ayazağa-Haftasonu)', points: 10 },
    { name: 'Tanıtım günleri (Fakülte-Haftasonu)', points: 8 },
    { name: 'Toplantı (saat başına)', points: 1 },
    { name: 'EMSA vb denet hazırlıkları (gün başına)', points: 3 },
    { name: 'EMSA/IMO/Bakanlık denet günü', points: 2 },
    { name: 'Rapor hazırlama (adet)', points: 2 },
    { name: 'Gözetmenlik (1 sınav)', points: 4 },
    { name: 'Gözetmenlik (2 sınav aynı gün)', points: 6 },
  ];

  const createdCategories = [];
  for (const c of categories) {
    const cat = await prisma.pointCategory.create({ data: c });
    createdCategories.push(cat);
  }
  console.log(`Created ${createdCategories.length} categories`);

  // Seed permanent duties for Begüm
  const begum = createdAssistants[0];
  const duties = [
    { name: 'Kalite komisyonu: ABET tüm evrakları düzenleme, raporlama', order: 1, assistantId: begum.id },
    { name: 'İTÜ DF Ar.Gör temsilciliği', order: 2, assistantId: begum.id },
    { name: 'MÜDEK', order: 3, assistantId: begum.id },
    { name: 'Tasarım Projesi Komisyonu', description: 'Düzenli olarak toplantılar yapılacaktır.', order: 4, assistantId: begum.id },
    { name: 'GMİM YL Komisyonu', description: 'Her hafta toplantı yapılmaktadır.', order: 5, assistantId: begum.id },
  ];
  for (const d of duties) {
    await prisma.permanentDuty.create({ data: d });
  }
  console.log(`Created ${duties.length} permanent duties`);

  // Seed exams
  const exams = [
    { courseCode: 'MEK', courseName: 'Engineering Mechanics', instructor: 'Banu Tansel Büyükçelebi', date: new Date('2026-01-17'), day: 'Cumartesi', timeSlot: '15:00-17:00', requiredSupervisors: 2 },
    { courseCode: 'KIM101E', courseName: 'Kimya', instructor: 'Yasin Arslanoğlu', date: new Date('2026-04-18'), day: 'Cumartesi', timeSlot: '10:00-12:00', requiredSupervisors: 1, notes: 'Makineden girildi' },
    { courseCode: 'GMI201', courseName: 'Gemi Makineleri', instructor: 'Ahmet Yılmaz', date: new Date('2026-05-20'), day: 'Çarşamba', timeSlot: '09:00-11:00', requiredSupervisors: 2 },
    { courseCode: 'GMI301', courseName: 'Deniz Ulaştırma', instructor: 'Mehmet Kaya', date: new Date('2026-05-22'), day: 'Cuma', timeSlot: '13:00-15:00', requiredSupervisors: 1 },
    { courseCode: 'GMI401', courseName: 'Gemi Ana Makineleri', instructor: 'Ali Demir', date: new Date('2026-06-10'), day: 'Çarşamba', timeSlot: '10:00-12:00', requiredSupervisors: 2 },
    { courseCode: 'MAT101E', courseName: 'Matematik I', instructor: 'Selin Arslan', date: new Date('2026-06-12'), day: 'Cuma', timeSlot: '09:00-11:30', requiredSupervisors: 2 },
  ];
  for (const e of exams) {
    await prisma.exam.create({ data: e });
  }
  console.log(`Created ${exams.length} exams`);

  // Seed weekly schedules
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
    const assistant = createdAssistants.find(a => a.name === sd.name);
    if (assistant) {
      await prisma.weeklySchedule.create({ data: { dayOfWeek: sd.dayOfWeek, timeSlot: sd.timeSlot, description: sd.description, assistantId: assistant.id } });
    }
  }
  console.log(`Created ${scheduleData.length} schedules`);

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
