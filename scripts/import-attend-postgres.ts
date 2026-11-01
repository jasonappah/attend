/**
 * Offline, one-way copy of the old Attend database into a NEW Takeout SQLite file.
 * The source is read-only and the destination must not already exist. Never run
 * against a live app database: install the resulting file only after backup and
 * validation, with all application and sync processes stopped.
 */
import { Database } from 'bun:sqlite'
import { readdir, readFile, open } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import pg from 'pg'

const source = process.env.ATTEND_POSTGRES_URL
const destination = process.argv[2]
if (!source || !destination) throw new Error('Usage: ATTEND_POSTGRES_URL=... bun scripts/import-attend-postgres.ts /path/to/new.sqlite')
const output = resolve(destination)
// O_EXCL prevents overwriting any existing file, including a live database.
const file = await open(output, 'wx', 0o600)
await file.close()
const sqlite = new Database(output)
const postgres = new pg.Client({ connectionString: source })

const fields: Record<string, readonly string[]> = {
  user: ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt'],
  account: ['id', 'accountId', 'providerId', 'userId', 'accessToken', 'refreshToken', 'idToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'password', 'createdAt', 'updatedAt'],
  calendar: ['id', 'upstreamUrl', 'userId', 'createdAt', 'updatedAt'],
  room: ['id', 'buildingCode', 'roomNumber', 'latitude', 'longitude', 'level', 'concept3dMapId', 'concept3dShape', 'concept3dCategoryName', 'concept3dLocationId', 'concept3dCategoryId', 'concept3dRoomId', 'createdAt', 'updatedAt'],
  course: ['id', 'calendarEventName', 'courseName', 'roomId', 'userId', 'calendarId', 'calendarEventId', 'calendarEventLastModified', 'createdAt', 'updatedAt'],
  courseSession: ['id', 'courseId', 'createdAt', 'updatedAt', 'attendance', 'startTime', 'endTime'],
}
const timestamps = new Set(['createdAt', 'updatedAt', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'calendarEventLastModified', 'startTime', 'endTime'])
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`

try {
  await postgres.connect()
  await postgres.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  sqlite.exec('PRAGMA foreign_keys = ON')
  sqlite.exec('BEGIN')
  sqlite.exec('CREATE TABLE "_app_migrations" (name TEXT PRIMARY KEY, "appliedAt" INTEGER NOT NULL)')
  const migrations = resolve(import.meta.dirname, '../database/migrations')
  for (const name of (await readdir(migrations, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name).sort()) {
    const sql = await readFile(join(migrations, name, 'migration.sql'), 'utf8')
    for (const statement of sql.split('--> statement-breakpoint')) if (statement.trim()) sqlite.exec(statement)
    sqlite.query('INSERT INTO "_app_migrations" VALUES (?, ?)').run(name, Date.now())
  }
  for (const [table, columns] of Object.entries(fields)) {
    const result = await postgres.query(`SELECT ${columns.map(quote).join(', ')} FROM ${quote(table)}`)
    const insert = sqlite.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    for (const row of result.rows) {
      const values = columns.map((column) => {
        const value: unknown = row[column]
        if (value == null && column === 'updatedAt' && (table === 'user' || table === 'account')) return row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now()
        if (value instanceof Date && timestamps.has(column)) return value.getTime()
        if (typeof value === 'boolean') return value ? 1 : 0
        if (column === 'concept3dShape' && value != null) return JSON.stringify(value)
        return value as string | number | null
      })
      insert.run(...values)
      if (table === 'user') {
        sqlite.query('INSERT INTO "userPublic" (id, name, username, image, "joinedAt") VALUES (?, ?, NULL, ?, ?)')
          .run(row.id, row.name, row.image, row.createdAt.getTime())
      }
    }
    console.info(`${table}: ${result.rowCount} rows`)
  }
  const errors = sqlite.query('PRAGMA foreign_key_check').all()
  if (errors.length) throw new Error(`Foreign key validation failed: ${JSON.stringify(errors)}`)
  sqlite.exec('COMMIT')
  await postgres.query('ROLLBACK')
  console.info(`Copied to ${output}. Verify it before installing; no source data was changed.`)
} catch (error) {
  try { sqlite.exec('ROLLBACK') } catch { /* no active transaction */ }
  throw error
} finally {
  sqlite.close()
  await postgres.end().catch(() => {})
}
