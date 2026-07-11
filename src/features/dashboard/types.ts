export type DashboardPriority = {
  title: string
  description: string
  href: string
  label: string
  count?: number
  tone: 'primary' | 'warning' | 'neutral'
}

export type DashboardMetric = {
  label: string
  value: number | string
  detail: string
}

export type DashboardTask = {
  id: string
  description: string
  status: string
  date: string
  points: number
  assistantName: string
}

export type DashboardExam = {
  id: string
  courseCode: string
  date: string
  supervisorGap: number
}

export type DashboardRanking = {
  id: string
  name: string
  totalPoints: number
}

export type DashboardData = {
  kind: 'assistant' | 'manager'
  context: {
    userName: string
    department: 'GMIM' | 'DUIM'
    generatedAt: string
  }
  priority: DashboardPriority
  metrics: DashboardMetric[]
  recentTasks: DashboardTask[]
  ranking: DashboardRanking[]
  upcomingExams: DashboardExam[]
}
