import type { ExamSupervisionReport, ReportTask } from '@/features/reports/exam-supervision-report'

// Turns the check list into concrete, plain-language fix steps. Nothing is applied automatically.

export const FIX_PLAN_SINCE = '2026-09-01'

export type FixAction = {
  taskId: string
  assistantName: string
  day: string
  kind: 'duplicate' | 'wrongPoints' | 'wrongPointsPending'
  problem: string
  steps: string[]
  // Change to the person's total if the steps are followed and re-added duties are accepted.
  pointChange: number
}
export type FixPlan = {
  since: string
  actions: FixAction[]
  people: { assistantName: string; pointChange: number; actions: number }[]
}

const label = (task: ReportTask) => `"${task.description}"`

export function buildFixPlan(report: ExamSupervisionReport, since: string): FixPlan {
  const actions: FixAction[] = []
  const removed = new Set<string>()

  for (const group of report.duplicates.filter((item) => item.day >= since)) {
    const kept = group.tasks.find((task) => !group.extraTaskIds.includes(task.id))
    for (const task of group.tasks.filter((item) => group.extraTaskIds.includes(item.id))) {
      removed.add(task.id)
      const approved = task.status === 'approved'
      actions.push({
        taskId: task.id,
        assistantName: group.assistantName,
        day: group.day,
        kind: 'duplicate',
        problem: `Aynı sınav iki kez girilmiş: ${label(task)}${kept ? `, ${label(kept)} ile aynı sınav` : ''}.`,
        steps: [
          `Görevler ekranında ${group.assistantName} kişisinin ${label(task)} görevini silin.${approved ? ` ${task.points} puan düşer.` : ' Bu görev henüz onaylanmadığı için puan düşmez; onaylansaydı aynı sınav için ikinci kez puan verilmiş olurdu.'}`,
          kept ? `${label(kept)} görevi kalır.` : 'Diğer görev kalır.',
        ],
        pointChange: approved ? -task.points : 0,
      })
    }
  }

  for (const row of report.mismatches.filter((item) => item.day >= since && !removed.has(item.task.id))) {
    const exam = `${row.exam.courseName || row.exam.courseCode} sınavı`
    const pending = row.task.status !== 'approved'
    const difference = row.suggested.points - row.task.points
    const direction = difference > 0 ? `${difference} puan eksik` : `${-difference} puan fazla`
    actions.push({
      taskId: row.task.id,
      assistantName: row.assistantName,
      day: row.day,
      kind: pending ? 'wrongPointsPending' : 'wrongPoints',
      problem: `${exam} için ${row.task.points} puan yazılmış; "${row.suggested.name}" baremine göre ${row.suggested.points} puan olmalı (${direction}).`,
      steps: pending
        ? [
            `Görevler ekranında ${row.assistantName} kişisinin ${label(row.task)} görevini silin. Kişi henüz kabul etmediği için puan düşmez.`,
            `Takvim'de ${exam}na tıklayın, "Puan baremi"nden "${row.suggested.name}" seçin ve ${row.assistantName} kişisini yeniden ekleyin. Kabul edince ${row.suggested.points} puan eklenir.`,
          ]
        : [
            `Görevler ekranında ${row.assistantName} kişisinin ${label(row.task)} görevini silin. ${row.task.points} puan düşer.`,
            `Takvim'de ${exam}na tıklayın, "Puan baremi"nden "${row.suggested.name}" seçin ve ${row.assistantName} kişisini yeniden ekleyin. Kabul edince ${row.suggested.points} puan eklenir.`,
          ],
      pointChange: pending ? 0 : difference,
    })
  }

  actions.sort((a, b) => a.assistantName.localeCompare(b.assistantName, 'tr') || a.day.localeCompare(b.day))
  const people = new Map<string, { assistantName: string; pointChange: number; actions: number }>()
  for (const action of actions) {
    const entry = people.get(action.assistantName) ?? { assistantName: action.assistantName, pointChange: 0, actions: 0 }
    entry.pointChange += action.pointChange
    entry.actions += 1
    people.set(action.assistantName, entry)
  }
  return { since, actions, people: [...people.values()] }
}
