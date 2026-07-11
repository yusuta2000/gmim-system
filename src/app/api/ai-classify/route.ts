import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/ai-classify - LLM-powered task classification
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskDescription } = body;

    if (!taskDescription) {
      return NextResponse.json({ error: 'taskDescription is required' }, { status: 400 });
    }

    // Get all point categories
    const categories = await db.pointCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Use real LLM via z-ai-web-dev-sdk
    const categoryList = categories.map(c => `- "${c.name}": ${c.points} puan${c.description ? ` (${c.description})` : ''}`).join('\n');

    const prompt = `Sen bir üniversite araştırma görevlisi görev sınıflandırma sistemisin. İTÜ Denizcilik Fakültesi GMIM bölümünde kullanılıyorsun.

Bir araştırma görevlisi yaptığı işi doğal dilde yazdı. Bu açıklamayı aşağıdaki puan baremine göre sınıflandır:

PUAN BAREMİ:
${categoryList}

GÖREV AÇIKLAMASI: "${taskDescription}"

Lütfen şu JSON formatında yanıt ver (başka hiçbir şey yazma):
{
  "matched": true/false,
  "categoryName": "eşleşen kategori adı veya null",
  "categoryId": "kategori bulunamazsa null",
  "suggestedPoints": önerilen_puan_sayısı,
  "confidence": 0.0_ile_1.0_arası_güven_skoru,
  "reasoning": "kısa_açıklama_neden_bu_kategoriyi_seçtin"
}

Eğer görev baremdeki hiçbir kategoriye uymuyorsa:
{
  "matched": false,
  "categoryName": null,
  "categoryId": null,
  "suggestedPoints": 0,
  "confidence": 0,
  "reasoning": "açıklama"
}

Önemli: En yakın kategoriyi bulmaya çalış. Kısmi eşleşmeler de kabul et. Eğer birden fazla kategori uyuyorsa en spesifik olanı seç.`;

    let llmResult: { matched: boolean; categoryName: string | null; categoryId: string | null; suggestedPoints: number; confidence: number; reasoning: string };

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: 'Sen bir görev sınıflandırma asistanısın. Sadece JSON formatında yanıt ver.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      });

      const content = completion.choices[0]?.message?.content || '';
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in LLM response');
      }
    } catch (llmError) {
      console.error('LLM classification failed, falling back to keyword matching:', llmError);
      // Fallback to keyword-based matching
      llmResult = keywordFallback(taskDescription, categories);
    }

    // Find the matching category from DB
    let matchedCategory: (typeof categories)[number] | null = null;
    if (llmResult.matched && llmResult.categoryName) {
      matchedCategory = categories.find(c =>
        c.name.toLowerCase() === llmResult.categoryName?.toLowerCase() ||
        c.name.toLowerCase().includes(llmResult.categoryName?.toLowerCase() || '') ||
        llmResult.categoryName?.toLowerCase().includes(c.name.toLowerCase())
      ) || null;
    }

    return NextResponse.json({
      matched: llmResult.matched && matchedCategory !== null,
      category: matchedCategory,
      confidence: llmResult.confidence,
      suggestedPoints: matchedCategory?.points || llmResult.suggestedPoints || 0,
      reasoning: llmResult.reasoning,
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

// Keyword fallback matching
function keywordFallback(desc: string, categories: { id: string; name: string; points: number; description: string | null }[]) {
  const d = desc.toLowerCase();

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

  let bestMatch: { category: typeof categories[0]; score: number } | null = null;

  for (const cat of categories) {
    let score = 0;
    const catLower = cat.name.toLowerCase();

    if (d.includes(catLower)) score += 50;

    const keywords = catLower.split(/[\s()\/]+/).filter(k => k.length > 2);
    for (const keyword of keywords) {
      if (d.includes(keyword)) score += keyword.length;
    }

    for (const [catKeyword, synonyms] of Object.entries(specialMappings)) {
      if (catLower.includes(catKeyword.toLowerCase())) {
        for (const synonym of synonyms) {
          if (d.includes(synonym)) score += 30;
        }
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category: cat, score };
    }
  }

  if (bestMatch) {
    return {
      matched: true,
      categoryName: bestMatch.category.name,
      categoryId: bestMatch.category.id,
      suggestedPoints: bestMatch.category.points,
      confidence: Math.min(bestMatch.score / 50, 1),
      reasoning: `Anahtar kelime eşleşmesi: "${bestMatch.category.name}" kategorisi ile eşleştirildi.`,
    };
  }

  return {
    matched: false,
    categoryName: null,
    categoryId: null,
    suggestedPoints: 0,
    confidence: 0,
    reasoning: 'Eşleşme bulunamadı.',
  };
}
