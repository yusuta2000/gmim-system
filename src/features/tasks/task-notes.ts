const REJECTION_REASON_MARKER = '\n\n[RET_SEBEBI]\n'

export function appendRejectionReason(notes: string | null, rejectionReason: string) {
  const reason = rejectionReason.trim()
  return notes?.trim() ? `${notes.trim()}${REJECTION_REASON_MARKER}${reason}` : `[RET_SEBEBI]\n${reason}`
}

export function splitTaskNotes(notes: string | null) {
  if (!notes) return { notes: null, rejectionReason: null }

  const markerIndex = notes.indexOf(REJECTION_REASON_MARKER)
  if (markerIndex >= 0) {
    return {
      notes: notes.slice(0, markerIndex).trim() || null,
      rejectionReason: notes.slice(markerIndex + REJECTION_REASON_MARKER.length).trim() || null,
    }
  }

  const prefix = '[RET_SEBEBI]\n'
  if (notes.startsWith(prefix)) {
    return { notes: null, rejectionReason: notes.slice(prefix.length).trim() || null }
  }

  return { notes, rejectionReason: null }
}
