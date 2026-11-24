// Pure helpers (no db import) so API routes, the reports page and scripts can share them.

export type BaremCategory = { id: string; name: string; points: number }
export type BaremOption = BaremCategory & { suggested: boolean }
export type BaremExam = { day: string; timeSlot: string; courseCode?: string; courseName?: string; classroom?: string | null; notes?: string | null }

export function normalizeTr(value: string | null | undefined) {
  return (value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u')
}

export function isExamRelated(text: string | null | undefined) {
  const n = normalizeTr(text)
  return n.includes('sinav') || n.includes('gozetmen')
}

const WEEKEND_DAYS = ['Cumartesi', 'Pazar']
// Mesai dışı: 08:30'dan önce veya 17:00 ve sonrasında başlayan hafta içi sınav.
const WORK_START = 8 * 60 + 30
const WORK_END = 17 * 60
// Havuz dersleri: matematik, fizik, kimya, Türkçe, Atatürk İlkeleri.
const POOL_PREFIXES = ['mat', 'fiz', 'kim', 'tur', 'ata']
const POOL_WORDS = ['matematik', 'fizik', 'kimya', 'turkce', 'turk dili', 'ataturk']

function startMinutes(timeSlot: string) {
  const match = timeSlot.match(/(\d{1,2}):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function examFeatures(exam: BaremExam) {
  const weekend = WEEKEND_DAYS.includes(exam.day)
  const start = startMinutes(exam.timeSlot)
  const code = normalizeTr(exam.courseCode).replace(/[^a-z]/g, '')
  const name = normalizeTr(exam.courseName)
  return {
    weekend,
    location: normalizeTr(`${exam.classroom ?? ''} ${exam.notes ?? ''} ${exam.courseName ?? ''}`).includes('maslak') ? 'maslak' : 'tuzla',
    pool: POOL_PREFIXES.some((prefix) => code.startsWith(prefix)) || POOL_WORDS.some((word) => name.includes(word)),
    afterHours: !weekend && start !== null && (start < WORK_START || start >= WORK_END),
    proficiency: name.includes('yeterlik') || normalizeTr(exam.notes).includes('yeterlik'),
  }
}

function categoryFeatures(name: string) {
  const flat = normalizeTr(name).replace(/\s+/g, '')
  return {
    weekend: flat.includes('haftasonu'),
    weekday: flat.includes('haftaici'),
    location: flat.includes('tuzla') ? 'tuzla' : flat.includes('maslak') ? 'maslak' : null,
    pool: flat.includes('havuz'),
    afterHours: flat.includes('mesaidisi') || flat.includes('uzun'),
    proficiency: flat.includes('yeterlik'),
    double: /2sinav|ikisinav/.test(flat),
  }
}

function score(category: BaremCategory, exam: ReturnType<typeof examFeatures>) {
  const c = categoryFeatures(category.name)
  if ((c.weekend && !exam.weekend) || (c.weekday && exam.weekend)) return 0
  if (c.double) return 1
  let value = 10
  if (!c.weekend && !c.weekday) value -= 1
  if (!c.location) value -= 1
  else if (c.location !== exam.location) value -= 5
  if (c.pool !== exam.pool) value -= 3
  if (c.afterHours !== exam.afterHours) value -= 3
  if (c.proficiency !== exam.proficiency) value -= 3
  return Math.max(value, 1)
}

// Exam-related barem categories ordered by fit for the exam; the first is the default suggestion.
export function examBaremOptions(categories: BaremCategory[], exam: BaremExam) {
  const related = categories.filter((category) => isExamRelated(category.name))
  const pool = related.length ? related : categories
  const features = examFeatures(exam)
  const scored = pool
    .map((category) => ({ category, value: score(category, features) }))
    .sort((a, b) => b.value - a.value || b.category.points - a.category.points || a.category.name.localeCompare(b.category.name, 'tr'))
  const best = scored[0]?.value ?? 0
  const options: BaremOption[] = scored.map(({ category, value }) => ({ ...category, suggested: value > 0 && value === best }))
  return { options, suggestedId: scored[0]?.category.id ?? null }
}

// Course codes such as "MAT 101E", "FIZ101" written in task descriptions.
export function courseCodes(text: string | null | undefined) {
  return [...normalizeTr(text).matchAll(/\b([a-z]{2,4})\s?(\d{3}[a-z]?)\b/g)].map((match) => `${match[1]}${match[2]}`)
}
