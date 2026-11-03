/**
 * Direct access to the application SQLite database for background-task
 * diagnostics. this is a separate, non-synced database that lives alongside
 * Zero's synced database; rows written here never leave the device.
 *
 * written through Drizzle like the rest of the app's database access
 * (createSQLiteDatabase + drizzle.insert / drizzle.select). drizzle binds
 * values as parameters rather than interpolating them into SQL, so there's no
 * SQL injection risk; the underlying driver prepares the statement internally
 * on each call.
 *
 * SQLite on native: neither `node:sqlite` (orez-lite/local) nor
 * `@o/database/sqlite`'s `bun:sqlite`-based providers are available in the
 * Hermes native bundle — they're Node/Bun runtime APIs, so they can't be
 * imported here. `getDb()` therefore returns null on native and
 * recordRun()/listRuns() degrade to no-ops until a Hermes-compatible local
 * SQLite store exists. on web every function is already a no-op, matching the
 * disabled diagnostics screen.
 *
 * a database can be injected via setDatabase() when one becomes available
 * (e.g. tests or a future native SQLite module).
 */

import type { SQLiteDatabase } from '@o/database/sqlite'
import { desc } from 'drizzle-orm'
import { One } from 'one'
import { isWeb } from 'tamagui'
import type { relations } from '~/database/relations'
import * as schema from '~/database/schema'
import { uuidv7 } from '~/helpers/uuid'

type LocalDb = SQLiteDatabase<typeof schema, typeof relations>

let db: LocalDb | null = null

export function setDatabase(database: LocalDb) {
  db = database
}

async function getDb(): Promise<LocalDb | null> {
  if (isWeb) return null
  if (db) return db
  return null
}

export type SystemStatus = {
  batteryLevel: number
  batteryState: string
  lowPowerMode: boolean
  deviceModel: string
  deviceSystemName: string
  deviceSystemVersion: string
  isSimulator: boolean
}

// one snapshot of battery + device state at the moment a background task ran.
// safe on every platform (web resolves defaults), though recordRun itself is
// native-only.
async function readSystemStatus(): Promise<SystemStatus> {
  const power = await One.Battery.getPowerState().catch(() => ({
    batteryLevel: -1,
    batteryState: 'unknown',
    lowPowerMode: false,
  }))
  const device = await One.Device.getInfo().catch(() => ({
    model: '',
    systemName: '',
    systemVersion: '',
    interfaceIdiom: '',
    isSimulator: false,
    vendorIdentifier: '',
  }))
  return {
    batteryLevel: power.batteryLevel,
    batteryState: power.batteryState,
    lowPowerMode: power.lowPowerMode,
    deviceModel: device.model,
    deviceSystemName: device.systemName,
    deviceSystemVersion: device.systemVersion,
    isSimulator: device.isSimulator,
  }
}

// drizzle stores boolean-ish columns as SQLite integers (0/1) on write and
// converts them back to booleans on read for columns declared with
// `mode: 'boolean'`, so the row shape coming out of .select() already
// matches TaskRunRow.
type TaskRunRow = {
  id: string
  task: string
  ranAt: number
  batteryLevel: number | null
  batteryState: string | null
  lowPowerMode: boolean | null
  deviceModel: string | null
  deviceSystemName: string | null
  deviceSystemVersion: string | null
  isSimulator: boolean | null
}

export async function recordRun(task: string) {
  if (isWeb) return
  const database = await getDb()
  if (!database) return
  const status = await readSystemStatus()
  await database.transaction(async ({ drizzle }) => {
    await drizzle.insert(schema.backgroundTaskRun).values({
      id: uuidv7(),
      task,
      ranAt: Date.now(),
      batteryLevel: status.batteryLevel,
      batteryState: status.batteryState,
      lowPowerMode: status.lowPowerMode ? 1 : 0,
      deviceModel: status.deviceModel,
      deviceSystemName: status.deviceSystemName,
      deviceSystemVersion: status.deviceSystemVersion,
      isSimulator: status.isSimulator ? 1 : 0,
    } as any)
  })
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  const database = await getDb()
  if (!database) return []
  const rows = await database.transaction(async ({ drizzle }) => {
    return drizzle
      .select()
      .from(schema.backgroundTaskRun)
      .orderBy(desc(schema.backgroundTaskRun.ranAt))
      .limit(limit)
  })
  return rows as unknown as TaskRunRow[]
}
