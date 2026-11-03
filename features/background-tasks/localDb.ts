/**
 * Direct access to the application SQLite database for background-task
 * diagnostics. this is a separate, non-synced database (managed by orex-lite,
 * backed by node:sqlite) that lives alongside Zero's synced database. rows
 * written here never leave the device.
 *
 * written through Drizzle like the rest of the app's database access, but
 * lazily: the underlying orex-lite / node:sqlite modules are not web-safe,
 * so they are only imported on native. on web every function is a no-op,
 * which matches the diagnostics screen running disabled there.
 */
import { One } from 'one'
import { isWeb } from 'tamagui'
import { desc } from 'drizzle-orm'
import type { SQLiteDatabase, SQLiteTransactionProvider } from '@o/database/sqlite'
import { uuidv7 } from '~/helpers/uuid'
import { relations } from '~/database/relations'
import * as schema from '~/database/schema'

type LocalDb = SQLiteDatabase<typeof schema, typeof relations>

let db: LocalDb | null = null

async function getDb(): Promise<LocalDb | null> {
  if (isWeb) return null
  if (db) return db
  const { createLocalApplicationSqlClientFactory } = await import('orez-lite/local')
  const { createSQLiteDatabase } = await import('@o/database/sqlite')
  const factory = createLocalApplicationSqlClientFactory({ dataDir: '.orez/application-sql' })
  const transactionProvider: SQLiteTransactionProvider = (work) =>
    factory('singleton').transaction(() => {
      throw new Error('localDb does not support Drizzle AST queries')
    }, work)
  db = createSQLiteDatabase({ schema, relations, transactionProvider })
  return db
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
      lowPowerMode: status.lowPowerMode,
      deviceModel: status.deviceModel,
      deviceSystemName: status.deviceSystemName,
      deviceSystemVersion: status.deviceSystemVersion,
      isSimulator: status.isSimulator,
    })
  })
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  const database = await getDb()
  if (!database) return []
  return database.transaction(async ({ drizzle }) => {
    return drizzle
      .select()
      .from(schema.backgroundTaskRun)
      .orderBy(desc(schema.backgroundTaskRun.ranAt))
      .limit(limit)
  })
}
