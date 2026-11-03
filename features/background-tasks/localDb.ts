/**
 * Direct access to a local SQLite database for background-task diagnostics.
 * this is a separate, non-synced database that lives alongside Zero's synced
 * database; rows written here never leave the device.
 *
 * on native, the database is backed by @op-engineering/op-sqlite — the same
 * Hermes-compatible SQLite library Zero uses for its local device cache on
 * React Native (see on-zero/kv-store's native export). node:sqlite and
 * bun:sqlite aren't available in the Hermes native bundle, so op-sqlite is
 * used instead. on web, op-sqlite isn't available, so every function is a
 * no-op, matching the disabled diagnostics screen.
 *
 * written with raw SQL (parameterized) rather than drizzle, since drizzle's
 * SQLite executor is built on bun:sqlite/node:sqlite which can't run in
 * Hermes.
 */
import { open } from '@op-engineering/op-sqlite'
import { One } from 'one'
import { isWeb } from 'tamagui'
import { uuidv7 } from '~/helpers/uuid'

let db: ReturnType<typeof open> | null = null

function getDb() {
  if (isWeb) return null
  if (!db) {
    db = open({ name: 'background-task-runs.db' })
    db.executeRawSync(`
      CREATE TABLE IF NOT EXISTS background_task_run (
        id TEXT PRIMARY KEY,
        task TEXT NOT NULL,
        ran_at INTEGER NOT NULL,
        battery_level INTEGER,
        battery_state TEXT,
        low_power_mode INTEGER,
        device_model TEXT,
        device_system_name TEXT,
        device_system_version TEXT,
        is_simulator INTEGER
      )
    `)
  }
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

// one snapshot of battery + device state at the moment a background task ran.
// safe on every platform (web resolves defaults), though recordRun itself is
// native-only.

export async function recordRun(task: string) {
  if (isWeb) return
  try {
    const status = await readSystemStatus()
    const database = getDb()
    if (!database) return
    const stmt = database.prepareStatement(
      `INSERT INTO background_task_run (id, task, ran_at, battery_level, battery_state, low_power_mode, device_model, device_system_name, device_system_version, is_simulator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    stmt.bindSync([
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
    ])
    stmt.executeSync()
  } catch (error) {
    // never let a recording failure take down the handler
    console.error('[background tasks] failed to record run', task, error)
  }
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  try {
    const database = getDb()
    if (!database) return []
    const result = database.executeSync(
      `SELECT id, task, ran_at, battery_level, battery_state, low_power_mode, device_model, device_system_name, device_system_version, is_simulator
       FROM background_task_run
       ORDER BY ran_at DESC
       LIMIT ?`,
      [limit]
    )
    return result.rows.map((row) => ({
      id: row.id as string,
      task: row.task as string,
      ranAt: Number(row.ran_at),
      batteryLevel: row.battery_level as number | null,
      batteryState: row.battery_state as string | null,
      lowPowerMode: row.low_power_mode == null ? null : row.low_power_mode === 1,
      deviceModel: row.device_model as string | null,
      deviceSystemName: row.device_system_name as string | null,
      deviceSystemVersion: row.device_system_version as string | null,
      isSimulator: row.is_simulator == null ? null : row.is_simulator === 1,
    }))
  } catch (error) {
    console.error('[background tasks] failed to list runs', error)
    return []
  }
}
