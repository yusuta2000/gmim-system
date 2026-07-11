export type PersonDuty = { id: string; name: string; description: string | null }

export type PersonDto = {
  id: string
  name: string
  email: string
  faculty: string
  department: string
  role: string
  isActive: boolean
  permanentDuties: PersonDuty[]
}

export type PersonOption = Pick<PersonDto, 'id' | 'name' | 'role' | 'isActive'>
