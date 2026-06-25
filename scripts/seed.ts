import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed Research Assistants
  const assistants = [
    { name: 'Begüm DOGANAY', email: 'doganaybe@itu.edu.tr', phone: '5071432107', totalPoints: 279, order: 1 },
    { name: 'Y.Tarık MUTLU', email: 'ymutlu@itu.edu.tr', phone: '', totalPoints: 274, order: 2 },
    { name: 'Fatih NACAR', email: 'nacar16@itu.edu.tr', phone: '5065813277', totalPoints: 267, order: 3 },
    { name: 'Samet BİÇEN', email: 'sbicen@itu.edu.tr', phone: '5522087166', totalPoints: 260, order: 4 },
    { name: 'Merve GÜL ÇIVGIN', email: 'gulme@itu.edu.tr', phone: '5425111429', totalPoints: 208, order: 5 },
    { name: 'Sinan COŞKUN', email: 'coskunm19@itu.edu.tr', phone: '5555240033', totalPoints: 200, order: 6 },
    { name: 'Rukiye GÜLMEZ', email: 'gulmezr@itu.edu.tr', phone: '5070963781', totalPoints: 174, order: 7 },
    { name: 'Muhittin ORHAN', email: 'orhanm17@itu.edu.tr', phone: '5545762801', totalPoints: 166, order: 8 },
    { name: 'Cenk KAYA', email: 'cenkkaya@itu.edu.tr', phone: '', totalPoints: 33, order: 9 },
    { name: 'Ö. Berkehan İNAL', email: 'inalo@itu.edu.tr', phone: '', totalPoints: 0, order: 10 },
  ];

  const createdAssistants = [];
  for (const a of assistants) {
    const ra = await prisma.researchAssistant.create({ data: a });
    createdAssistants.push(ra);
  }

  // Seed Point Categories
  const categories = [
    { name: 'MÜDEK', points: 4, description: 'MÜDEK related work' },
    { name: 'Ders Programı İşleri (1 saat)', points: 1, description: 'Course schedule work, 1 hour' },
    { name: 'Ders Programı İşleri (2-3 saat)', points: 2, description: 'Course schedule work, 2-3 hours' },
    { name: 'Ders Programı İşleri (4+ saat)', points: 3, description: 'Course schedule work, 4+ hours' },
    { name: 'Maslak haftaiçi 1 sınav', points: 4, description: 'Weekday exam at Maslak campus' },
    { name: 'Maslak haftaici 2 sınav', points: 6, description: 'Two weekday exams at Maslak' },
    { name: 'Haftasonu sınavı', points: 5, description: 'Weekend exam duty' },
    { name: 'Yüksek lisans bitirme tezi (adet)', points: 3, description: 'Per thesis' },
    { name: 'Liman Komisyonu', points: 1, description: 'Port commission' },
    { name: 'Not Komisyonu (40-50 kişi)', points: 3, description: 'Grade committee for 40-50 students' },
    { name: 'Not Komisyonu (max 10 kişi)', points: 2, description: 'Grade committee for max 10 students' },
    { name: 'Fakülte Gezisi (1-2 saat)', points: 2, description: 'Faculty tour, 1-2 hours' },
    { name: 'Fakülte Gezisi (2 Saat üzeri)', points: 3, description: 'Faculty tour, 2+ hours' },
    { name: 'Tanıtım günleri (Ayazağa-Haftaiçi)', points: 8, description: 'Promotion days at Ayazağa, weekday' },
    { name: 'Tanıtım günleri (Fakülte-Haftaiçi)', points: 6, description: 'Promotion days at Faculty, weekday' },
    { name: 'Tanıtım günleri (Ayazağa-Haftasonu)', points: 10, description: 'Promotion days at Ayazağa, weekend' },
    { name: 'Tanıtım günleri (Fakülte-Haftasonu)', points: 8, description: 'Promotion days at Faculty, weekend' },
    { name: 'Toplantı (saat başına)', points: 1, description: 'Meeting, per hour' },
    { name: 'EMSA vb denet hazırlıkları (gün başına)', points: 3, description: 'EMSA audit prep, per day' },
    { name: 'EMSA/IMO/Bakanlık denet günü', points: 2, description: 'EMSA/IMO audit day' },
    { name: 'Rapor hazırlama (adet)', points: 2, description: 'Report preparation, per report' },
    { name: 'Gözetmenlik (1 sınav)', points: 4, description: 'Exam supervision for 1 exam' },
    { name: 'Gözetmenlik (2 sınav aynı gün)', points: 6, description: 'Exam supervision for 2 exams same day' },
  ];

  const createdCategories = [];
  for (const c of categories) {
    const cat = await prisma.pointCategory.create({ data: c });
    createdCategories.push(cat);
  }

  // Seed some tasks for Begüm
  const begum = createdAssistants[0];
  const mudukCat = createdCategories[0];
  const dersProgCat = createdCategories[2];

  const sampleTasks = [
    { number: 1, description: 'Toplantı (MÜDEK)', hoursWorked: '5', date: new Date('2025-07-21'), points: 4, status: 'approved', source: 'external', assistantId: begum.id, categoryId: mudukCat.id },
    { number: 2, description: 'MÜDEK ders katalogları hazırlama', hoursWorked: '4', date: new Date('2025-07-21'), points: 2, status: 'approved', source: 'external', assistantId: begum.id, categoryId: mudukCat.id },
    { number: 3, description: 'Tanıtım günleri (Fakülte-Haftaiçi)', hoursWorked: 'TÜM GÜN', date: new Date('2025-07-24'), points: 6, status: 'approved', source: 'external', assistantId: begum.id, categoryId: createdCategories[14].id },
    { number: 4, description: 'Ders Programı İşleri', hoursWorked: '11:00-16:00', date: new Date('2025-09-01'), points: 3, status: 'approved', source: 'external', assistantId: begum.id, categoryId: dersProgCat.id },
    { number: 5, description: 'Not Komisyonu', hoursWorked: '09:00-12:00', date: new Date('2025-09-25'), points: 2, status: 'approved', source: 'external', assistantId: begum.id, categoryId: createdCategories[9].id },
  ];

  for (const t of sampleTasks) {
    await prisma.task.create({ data: t });
  }

  // Seed permanent duties
  const permanentDuties = [
    { name: 'Kalite komisyonu: ABET tüm evrakları düzenleme, raporlama', order: 1, assistantId: begum.id },
    { name: 'İTÜ DF Ar.Gör temsilciliği', order: 2, assistantId: begum.id },
    { name: 'İTÜ DF Makine Ar.Gör.Temsilciliği', order: 3, assistantId: begum.id },
    { name: 'MÜDEK', order: 4, assistantId: begum.id },
    { name: 'Tasarım Projesi Komisyonu', description: 'Düzenli olarak toplantılar yapılacaktır.', order: 5, assistantId: begum.id },
    { name: 'GMİM YL Komisyonu', description: 'Her hafta toplantı yapılmaktadır.', order: 6, assistantId: begum.id },
  ];

  for (const pd of permanentDuties) {
    await prisma.permanentDuty.create({ data: pd });
  }

  // Seed sample exams
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

  console.log('Seed data created successfully!');
  console.log(`- ${createdAssistants.length} research assistants`);
  console.log(`- ${createdCategories.length} point categories`);
  console.log(`- ${sampleTasks.length} sample tasks`);
  console.log(`- ${permanentDuties.length} permanent duties`);
  console.log(`- ${exams.length} sample exams`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
