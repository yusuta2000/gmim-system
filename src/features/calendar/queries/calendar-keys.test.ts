import { describe, expect, it } from 'vitest'
import { calendarKeys } from './calendar-keys'

describe('calendarKeys', () => {
  it('separates department and domain caches', () => {
    expect(calendarKeys.exams('GMIM')).toEqual(['calendar', 'GMIM', 'exams'])
    expect(calendarKeys.schedule('GMIM')).toEqual(['calendar', 'GMIM', 'schedule'])
    expect(calendarKeys.exams('DUIM')).not.toEqual(calendarKeys.exams('GMIM'))
  })
})
