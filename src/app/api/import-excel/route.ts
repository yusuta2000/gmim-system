import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = formData.get('type') as string || 'tasks';
    const department = (formData.get('department') as string) || 'GMIM';

    if (!file) {
      return NextResponse.json({ error: 'Dosya yüklenemedi' }, { status: 400 });
    }

    // Create import log
    const importLog = await db.importLog.create({
      data: {
        fileName: file.name,
        fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        status: 'processing',
      },
    });

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = buffer.toString('utf-8');

      // Simple CSV parsing
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        throw new Error('Dosya boş veya geçersiz format');
      }

      const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/"/g, ''));
      let imported = 0;

      if (importType === 'tasks') {
        // Import tasks
        // Expected columns: Görev, Araş Gör, Tarih, Puan, Saat
        const descIdx = headers.findIndex(h => h.toLowerCase().includes('görev') || h.toLowerCase().includes('task') || h.toLowerCase().includes('açıklama'));
        const assIdx = headers.findIndex(h => h.toLowerCase().includes('araş') || h.toLowerCase().includes('gör') || h.toLowerCase().includes('assistant') || h.toLowerCase().includes('isim'));
        const dateIdx = headers.findIndex(h => h.toLowerCase().includes('tarih') || h.toLowerCase().includes('date'));
        const pointsIdx = headers.findIndex(h => h.toLowerCase().includes('puan') || h.toLowerCase().includes('point'));
        const hoursIdx = headers.findIndex(h => h.toLowerCase().includes('saat') || h.toLowerCase().includes('hour'));

        const assistants = await db.researchAssistant.findMany({ where: { department } });

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''));
          if (cols.length < 2) continue;

          const description = descIdx >= 0 ? cols[descIdx] : cols[1];
          const assName = assIdx >= 0 ? cols[assIdx] : cols[0];
          const dateStr = dateIdx >= 0 ? cols[dateIdx] : new Date().toISOString();
          const points = pointsIdx >= 0 ? parseInt(cols[pointsIdx]) || 0 : 0;
          const hours = hoursIdx >= 0 ? cols[hoursIdx] : null;

          if (!description || !assName) continue;

          // Find assistant by name (fuzzy match)
          const assistant = assistants.find(a =>
            a.name.toLowerCase().includes(assName.toLowerCase()) ||
            assName.toLowerCase().includes(a.name.toLowerCase())
          );

          if (!assistant) continue;

          // Get max task number
          const maxTask = await db.task.findFirst({
            where: { assistantId: assistant.id },
            orderBy: { number: 'desc' },
            select: { number: true },
          });

          await db.task.create({
            data: {
              number: (maxTask?.number || 0) + 1,
              description,
              hoursWorked: hours,
              date: dateStr ? new Date(dateStr) : new Date(),
              points,
              status: 'approved',
              source: 'import',
              assistantId: assistant.id,
            },
          });

          // Update total points
          if (points > 0) {
            await db.researchAssistant.update({
              where: { id: assistant.id },
              data: { totalPoints: { increment: points } },
            });
          }

          imported++;
        }
      } else if (importType === 'exams') {
        // Import exams
        // Expected: Ders Kodu, Ders Adı, Öğretim Üyesi, Tarih, Gün, Saat, Gözetmen Sayısı
        const codeIdx = headers.findIndex(h => h.toLowerCase().includes('kod') || h.toLowerCase().includes('code'));
        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('ders') || h.toLowerCase().includes('ad'));
        const instrIdx = headers.findIndex(h => h.toLowerCase().includes('öğretim') || h.toLowerCase().includes('hoca') || h.toLowerCase().includes('instructor'));
        const dateIdx = headers.findIndex(h => h.toLowerCase().includes('tarih') || h.toLowerCase().includes('date'));
        const dayIdx = headers.findIndex(h => h.toLowerCase().includes('gün') || h.toLowerCase().includes('day'));
        const timeIdx = headers.findIndex(h => h.toLowerCase().includes('saat') || h.toLowerCase().includes('time'));
        const supIdx = headers.findIndex(h => h.toLowerCase().includes('gözetmen') || h.toLowerCase().includes('supervisor'));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/"/g, ''));
          if (cols.length < 2) continue;

          await db.exam.create({
            data: {
              courseCode: codeIdx >= 0 ? cols[codeIdx] : cols[0],
              courseName: nameIdx >= 0 ? cols[nameIdx] : cols[1],
              instructor: instrIdx >= 0 ? cols[instrIdx] : '',
              date: dateIdx >= 0 && cols[dateIdx] ? new Date(cols[dateIdx]) : new Date(),
              day: dayIdx >= 0 ? cols[dayIdx] : '',
              timeSlot: timeIdx >= 0 ? cols[timeIdx] : '',
              department,
              requiredSupervisors: supIdx >= 0 ? parseInt(cols[supIdx]) || 1 : 1,
            },
          });

          imported++;
        }
      }

      // Update import log
      await db.importLog.update({
        where: { id: importLog.id },
        data: { recordCount: imported, status: 'completed' },
      });

      return NextResponse.json({
        message: `${imported} kayıt başarıyla içe aktarıldı`,
        imported,
        totalLines: lines.length - 1,
        importLogId: importLog.id,
      });
    } catch (parseError) {
      await db.importLog.update({
        where: { id: importLog.id },
        data: { status: 'failed', error: String(parseError) },
      });
      throw parseError;
    }
  } catch (error) {
    console.error('Error importing file:', error);
    return NextResponse.json({ error: 'Dosya içe aktarma hatası: ' + String(error) }, { status: 500 });
  }
}
