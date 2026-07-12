import { hashPassword } from '../../src/lib/auth/password'

let cachedPasswords: Record<string, string> | null = null

function seedPasswords(): Record<string, string> {
  if (cachedPasswords) return cachedPasswords

  const raw = process.env.SEED_PASSWORDS_JSON
  if (!raw) throw new Error('SEED_PASSWORDS_JSON is required')

  const parsed = JSON.parse(raw) as Record<string, unknown>
  cachedPasswords = Object.fromEntries(Object.entries(parsed).map(([email, password]) => {
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error(`Seed password for ${email} must contain at least 12 characters`)
    }
    return [email, password]
  }))
  return cachedPasswords
}

export async function seedPasswordHash(email: string): Promise<string> {
  const password = seedPasswords()[email]
  if (!password) throw new Error(`Missing seed password for ${email}`)
  return hashPassword(password)
}
