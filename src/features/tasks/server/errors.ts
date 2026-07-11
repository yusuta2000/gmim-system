export type TaskServiceErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'BAD_REQUEST'

export class TaskServiceError extends Error {
  constructor(
    public readonly code: TaskServiceErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'TaskServiceError'
  }
}

export function taskErrorStatus(error: TaskServiceError) {
  if (error.code === 'NOT_FOUND') return 404
  if (error.code === 'FORBIDDEN') return 403
  if (error.code === 'CONFLICT') return 409
  return 400
}
