export type PointCategoryBreakdown = {
  name: string
  points: number
  count: number
}

export type PointDetails = {
  approvedTaskCount: number
  approvedPoints: number
  averagePoints: number
  lastTaskDate: string | null
  categories: PointCategoryBreakdown[]
}

export type PointPerson = {
  id: string
  name: string
  totalPoints: number
  isActive: boolean
  role: 'admin' | 'user'
  isCurrentUser: boolean
  details?: PointDetails
}

export type PointsResponse = {
  department: 'GMIM' | 'DUIM'
  canViewDetails: boolean
  people: PointPerson[]
}
