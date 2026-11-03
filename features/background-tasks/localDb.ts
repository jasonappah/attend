/**
 * Direct access to the application SQLite database for background-task
 * diagnostics. this is a separate, non-synced database (managed by orex-lite,
 * backed by node:sqlite) that lives alongside Zero's synced database. rows
 * written here never leave the device.
 *
 * writes and reads go through prepared statements on the transaction
 * executor (`executor.exec` / `executor.query`), so every parameter is bound
 * positionally through node:sqlite's prepared-statement path. the orex-lite /
 * node:sqlite modules are lazily imported only on native — they aren't
 * web-safe — so on web every function is a no-op, matching the disabled
 * diagnostics screen.
 */
import { One } from 'one'
import { isWeb } from 'tamagui'
import type { SQLiteTransactionExecutor, SQLiteTransactionProvider } from '@o/database/sqlite'
import { uuidv7 } from '~/helpers/uuid'
import { relations } from '~/database/relations'
import * as schema from '~/database/schema'

type LocalDb = ReturnType<typeof import('@o/database/sqlite').createSQLiteDatabase>

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

// one row read back from the backgroundTaskRun table.
type TaskRunRow = {
  id: string
  task: string
  ranAt: number
  batteryLevel: number | null
  batteryState: string | null
  lowPowerMode: number | null
  deviceModel: string | null
  deviceSystemName: string | null
  deviceSystemVersion: string | null
  isSimulator: number | null
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
  await database.transaction(async ({ executor }) => {
    await executor.exec(
      `INSERT INTO backgroundTaskRun (id, task, ranAt, batteryLevel, batteryState, lowPowerMode, deviceModel, deviceSystemName, deviceSystemVersion, isSimulator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv7(),
        task,
        Date.now(),
        status.batteryLevel,
        status.batteryState,
        status.lowPowerMode ? 1 : 0,
        status.deviceModel,
        status.deviceSystemName,
        status.deviceSystemVersion,
        status.isSimulator ? 1 : 0,
      ]
    )
  })
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  const database = await getDb()
  if (!database) return []
  return database.transaction(async ({ executor }) => {
    const rows = await executor.query<TaskRunRow>(
      `SELECT id, task, ranAt, batteryLevel, batteryState, lowPowerMode,
              deviceModel, deviceSystemName, deviceSystemVersion, isSimulator
       FROM backgroundTaskRun ORDER BY ranAt DESC LIMIT ?`,
      [limit]
    )
    return rows.map((row) => ({
      ...row,
      lowPowerMode: row.lowPowerMode === 1 ? true : row.lowPowerMode === 0 ? false : null,
      isSimulator: row.isSimulator === 1 ? true : row.isSimulator === 0 ? false : null,
    }))
  })
}
