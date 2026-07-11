import { hash, verify, type Algorithm } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  algorithm: 2 as Algorithm,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password)
}
