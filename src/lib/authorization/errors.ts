export type AuthorizationErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN'

export class AuthorizationError extends Error {
  constructor(public readonly code: AuthorizationErrorCode) {
    super(code)
  }
}
