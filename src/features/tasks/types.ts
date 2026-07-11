export type TaskStatus = 'pending' | 'assigned' | 'approved' | 'rejected'

export type TaskDto = {
  id: string
  number: number
  description: string
  hoursWorked: string | null
  date: string
  points: number
  status: TaskStatus
  source: string
  notes: string | null
  assistantId: string
  categoryId: string | null
  createdAt: string
  assistant: {
    id: string
    name: string
    department: string
    totalPoints: number
    isActive: boolean
  }
  category: { id: string; name: string; points: number } | null
}

export type TaskListResponse = {
  items: TaskDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type TaskFilters = {
  page: number
  pageSize?: number
  search?: string
  status?: TaskStatus
  assistantId?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
}
