import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskDescription } = body;

    if (!taskDescription) {
      return NextResponse.json({ error: 'taskDescription is required' }, { status: 400 });
    }

    // Get all point categories for matching
    const categories = await db.pointCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Simple keyword-based matching algorithm
    // In a full implementation, this would use an LLM for semantic matching
    const desc = taskDescription.toLowerCase();

    let bestMatch: { category: typeof categories[0]; score: number } | null = null;

    for (const cat of categories) {
      const keywords = cat.name.toLowerCase().split(/[\s()\/]+/).filter(k => k.length > 2);
      let score = 0;

      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          score += keyword.length; // Longer keyword matches score higher
        }
      }

      // Bonus for exact substring match
      if (desc.includes(cat.name.toLowerCase())) {
        score += 50;
      }

      // Special keyword mappings
      const specialMappings: Record<string, string[]> = {
        'MÜDEK': ['müdek', 'mudek', 'akreditasyon'],
        'Ders Programı': ['ders programı', 'ders programi', 'schedule', 'program işleri'],
        'Not Komisyonu': ['not komisyonu', 'not gir', 'karne'],
        'Tanıtım': ['tanıtım', 'tanitim', 'promotion', 'açık gün'],
        'Toplantı': ['toplantı', 'toplatı', 'meeting', 'görüşme'],
        'Gözetmenlik': ['gözetmen', 'gozetmen', 'sınav gözetmen', 'supervisor'],
        'Fakülte Gezisi': ['gezi', 'tur', 'fakülte gezisi'],
        'EMSA': ['emsa', 'imo', 'denet', 'audit'],
        'Rapor': ['rapor', 'report', 'hazırlama'],
        'Liman': ['liman', 'port'],
        'Tez': ['tez', 'bitirme', 'yüksek lisans'],
      };

      for (const [catKeyword, synonyms] of Object.entries(specialMappings)) {
        if (cat.name.toLowerCase().includes(catKeyword.toLowerCase())) {
          for (const synonym of synonyms) {
            if (desc.includes(synonym)) {
              score += 30;
            }
          }
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { category: cat, score };
      }
    }

    if (bestMatch) {
      return NextResponse.json({
        matched: true,
        category: bestMatch.category,
        confidence: Math.min(bestMatch.score / 50, 1),
        suggestedPoints: bestMatch.category.points,
        allCategories: categories.map(c => ({
          id: c.id,
          name: c.name,
          points: c.points,
        })),
      });
    }

    // No match found - return all categories for manual selection
    return NextResponse.json({
      matched: false,
      category: null,
      confidence: 0,
      suggestedPoints: 0,
      message: 'Eşleşme bulunamadı. Lütfen kategoriyi manuel olarak seçin.',
      allCategories: categories.map(c => ({
        id: c.id,
        name: c.name,
        points: c.points,
      })),
    });
  } catch (error) {
    console.error('Error classifying task:', error);
    return NextResponse.json({ error: 'Failed to classify task' }, { status: 500 });
  }
}
