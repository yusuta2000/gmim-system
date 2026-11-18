import { describe, expect, it } from 'vitest'
import { appendRejectionReason, splitTaskNotes } from './task-notes'

describe('task rejection notes', () => {
  it('preserves the original note and exposes the rejection reason separately', () => {
    const stored = appendRejectionReason('Mevcut görev notu', 'Ders programımla çakışıyor')

    expect(splitTaskNotes(stored)).toEqual({
      notes: 'Mevcut görev notu',
      rejectionReason: 'Ders programımla çakışıyor',
    })
  })

  it('hides the internal exam link from displayed notes', () => {
    expect(splitTaskNotes('[SINAV] exam-1')).toEqual({ notes: null, rejectionReason: null })
    expect(splitTaskNotes(appendRejectionReason('[SINAV] exam-1', 'Raporluyum'))).toEqual({
      notes: null,
      rejectionReason: 'Raporluyum',
    })
  })

  it('stores a rejection reason when the task has no note', () => {
    expect(splitTaskNotes(appendRejectionReason(null, 'Şehir dışında olacağım'))).toEqual({
      notes: null,
      rejectionReason: 'Şehir dışında olacağım',
    })
  })
})
