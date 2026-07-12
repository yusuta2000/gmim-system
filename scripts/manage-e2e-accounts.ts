import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { hashPassword } from '../src/lib/auth/password'

type Department = 'GMIM' | 'DUIM'
type Role = 'user' | 'admin' | 'baskan' | 'dekan'

type AccountPlan = {
  id: string
  name: string
  email: string
  role: Role
  department: Department
}

type AccountCredential = AccountPlan & { password: string }

const credentialsPath = 'local-e2e-credentials.json'
const sqlPath = 'local-e2e-reset.sql'

const accounts: AccountPlan[] = [
  { id: 'e2e-user-gmim', name: 'E2E GMİM Kullanıcı', email: 'e2e-user-gmim@itudf.test', role: 'user', department: 'GMIM' },
  { id: 'e2e-admin-gmim', name: 'E2E GMİM Temsilci', email: 'e2e-admin-gmim@itudf.test', role: 'admin', department: 'GMIM' },
  { id: 'e2e-baskan-gmim', name: 'E2E GMİM Bölüm Başkanı', email: 'e2e-baskan-gmim@itudf.test', role: 'baskan', department: 'GMIM' },
  { id: 'e2e-user-duim', name: 'E2E DUİM Kullanıcı', email: 'e2e-user-duim@itudf.test', role: 'user', department: 'DUIM' },
  { id: 'e2e-admin-duim', name: 'E2E DUİM Temsilci', email: 'e2e-admin-duim@itudf.test', role: 'admin', department: 'DUIM' },
  { id: 'e2e-baskan-duim', name: 'E2E DUİM Bölüm Başkanı', email: 'e2e-baskan-duim@itudf.test', role: 'baskan', department: 'DUIM' },
  { id: 'e2e-dekan', name: 'E2E Fakülte Dekanı', email: 'e2e-dekan@itudf.test', role: 'dekan', department: 'GMIM' },
]

const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`

async function buildSql(credentials: AccountCredential[]) {
  const inserts = []
  for (const account of credentials) {
    const passwordHash = await hashPassword(account.password)
    inserts.push(`INSERT INTO "ResearchAssistant" ("id", "name", "email", "phone", "faculty", "department", "totalPoints", "order", "isActive", "role", "password", "passwordHash", "createdAt", "updatedAt") VALUES (${[
      sqlString(account.id), sqlString(account.name), sqlString(account.email), 'NULL', sqlString('DZ'), sqlString(account.department), '0', '0', 'true', sqlString(account.role), 'NULL', sqlString(passwordHash), 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP',
    ].join(', ')});`)
  }

  return `BEGIN;
DELETE FROM "AnnouncementComment";
DELETE FROM "Announcement";
DELETE FROM "Notification";
DELETE FROM "PendingDutyChange";
DELETE FROM "WeeklySchedule";
DELETE FROM "ExamSupervisor";
DELETE FROM "Exam";
DELETE FROM "PermanentDuty";
DELETE FROM "Task";
DELETE FROM "Session";
DELETE FROM "ImportLog";
DELETE FROM "ResearchAssistant";
DELETE FROM "PointCategory";
INSERT INTO "PointCategory" ("id", "name", "points", "description", "isActive", "createdAt", "updatedAt") VALUES ('e2e-category-meeting', 'E2E Toplantı', 2, 'Staging görev akışları için sabit kategori', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO "PointCategory" ("id", "name", "points", "description", "isActive", "createdAt", "updatedAt") VALUES ('e2e-category-exam', 'E2E Sınav Görevi', 4, 'Staging sınav akışları için sabit kategori', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
${inserts.join('\n')}
COMMIT;
`
}

async function generate(force: boolean) {
  if (!force && (existsSync(credentialsPath) || existsSync(sqlPath))) {
    throw new Error(`Local E2E files already exist; use --force to replace them`)
  }

  const credentials: AccountCredential[] = []
  for (const account of accounts) {
    const password = randomBytes(24).toString('base64url')
    credentials.push({ ...account, password })
  }

  const sql = await buildSql(credentials)

  writeFileSync(credentialsPath, `${JSON.stringify({ version: 1, baseUrl: '', accounts: credentials }, null, 2)}\n`, { mode: 0o600 })
  writeFileSync(sqlPath, sql, { mode: 0o600 })
  console.log(`Generated ${accounts.length} accounts in ignored local files; no passwords were printed`)
}

async function refreshSql() {
  if (!existsSync(credentialsPath)) throw new Error(`${credentialsPath} does not exist`)
  const parsed = JSON.parse(readFileSync(credentialsPath, 'utf8')) as { accounts: AccountCredential[] }
  if (parsed.accounts.length !== accounts.length) throw new Error(`Expected ${accounts.length} local E2E credentials`)
  writeFileSync(sqlPath, await buildSql(parsed.accounts), { mode: 0o600 })
  console.log(`Refreshed ignored SQL for ${parsed.accounts.length} accounts; no passwords were printed`)
}

function setBaseUrl(value: string) {
  if (!existsSync(credentialsPath)) throw new Error(`${credentialsPath} does not exist`)
  const origin = new URL(value).origin
  if (origin === 'https://itudfportal.vercel.app') {
    throw new Error('Production URL cannot be used as the E2E base URL')
  }
  const parsed = JSON.parse(readFileSync(credentialsPath, 'utf8')) as { version: number; baseUrl: string; accounts: unknown[] }
  parsed.baseUrl = origin
  writeFileSync(credentialsPath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 })
  console.log(`Updated the local staging URL; no credentials were printed`)
}

async function main() {
  const args = process.argv.slice(2)
  const baseUrlArg = args.find((arg) => arg.startsWith('--set-base-url='))
  if (baseUrlArg) return setBaseUrl(baseUrlArg.slice('--set-base-url='.length))
  if (args.includes('--refresh-sql')) return refreshSql()
  if (args.includes('--generate')) return generate(args.includes('--force'))

  console.log('Dry run: no files or databases will be changed')
  console.table(accounts.map(({ id, role, department, email }) => ({ id, role, department, email })))
  console.log('Run with --generate to create ignored credential and SQL files')
}

await main()
