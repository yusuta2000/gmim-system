import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tasks';
    const department = searchParams.get('department');

    const wb = XLSX.utils.book_new();

    if (type === 'tasks') {
      const tasks = await db.task.findMany({
        where: department ? { assistant: { department } } : {},
        orderBy: { date: 'desc' },
        include: { assistant: true, category: true },
      });
      const data = tasks.map(t => ({
        'No': t.number,
        'Araş Gör': t.assistant?.name || '',
        'Görev': t.description,
        'Tarih': new Date(t.date).toLocaleDateString('tr-TR'),
        'Saat': t.hoursWorked || '',
        'Puan': t.points,
        'Kategori': t.category?.name || '',
        'Kaynak': t.source === 'auto_assigned' ? 'Otomatik' : t.source === 'import' ? 'İçe Aktarma' : t.source === 'temsilci_assigned' ? 'Temsilci' : 'Kendi Bildirimi',
        'Durum': t.status === 'approved' ? 'Onaylı' : t.status === 'pending' ? 'Bekliyor' : 'Reddedildi',
        'Notlar': t.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 6 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Görevler');
    }

    if (type === 'ranking') {
      const assistants = await db.researchAssistant.findMany({
        where: department ? { department, role: { in: ['admin', 'user'] } } : {},
        orderBy: { totalPoints: 'asc' },
        include: { permanentDuties: true },
      });
      const data = assistants.map((a, idx) => ({
        'Sıra': idx + 1,
        'Ad Soyad': a.name,
        'E-posta': a.email,
        'Fakülte': a.faculty,
        'Bölüm': a.department,
        'Toplam Puan': a.totalPoints,
        'Durum': a.isActive ? 'Aktif' : 'Pasif',
        'Rol': a.role === 'admin' ? 'Temsilci' : 'Araş Gör',
        'Daimi Görevler': a.permanentDuties.map(d => d.name).join(', '),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Puan Tablosu');
    }

    if (type === 'exams') {
      const exams = await db.exam.findMany({
        where: department ? { department } : {},
        orderBy: { date: 'desc' },
        include: { supervisors: { include: { assistant: true } } },
      });
      const data = exams.map(e => ({
        'Ders Kodu': e.courseCode,
        'Ders Adı': e.courseName,
        'Öğr. Üyesi': e.instructor,
        'Tarih': new Date(e.date).toLocaleDateString('tr-TR'),
        'Gün': e.day,
        'Saat': e.timeSlot,
        'Gözetmen Sayısı': `${e.supervisors.length}/${e.requiredSupervisors}`,
        'Gözetmenler': e.supervisors.map(s => s.assistant.name).join(', '),
        'Notlar': e.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Sınavlar');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${(department || 'export').toLowerCase()}_${type}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json({ error: 'Excel oluşturma hatası' }, { status: 500 });
  }
}
