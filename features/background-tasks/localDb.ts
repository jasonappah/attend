/**
 * Direct access to the application SQLite database for background-task
 * diagnostics. this is a separate, non-synced database (managed by orex-lite,
 * backed by node:sqlite) that lives alongside Zero's synced database. rows
 * written here never leave the device.
 *
 * only raw SQL is used (exec / query), so no Drizzle query compiler is
 * needed. the dummy compileQuery satisfies the transaction API but throws if
 * anything tries to compile a Drizzle AST.
 */
import { One } from 'one'
import { createLocalApplicationSqlClientFactory } from 'orez-lite/local'
import { uuidv7 } from '~/helpers/uuid'

const factory = createLocalApplicationSqlClientFactory({ dataDir: '.orez/application-sql' })

const compileQuery = (() => {
  throw new Error('localDb does not support Drizzle AST queries')
}) as any

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
// battery and device reads are safe on every platform (web resolves defaults),
// but recordRun is only called from the native setup file.
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
  const status = await readSystemStatus()
  await factory('singleton').transaction(compileQuery, async (tx) => {
    await tx.exec(
      `INSERT INTO backgroundTaskRun (id, task, ranAt, batteryLevel, batteryState, lowPowerMode, deviceModel, deviceSystemName, deviceSystemVersion, isSimulator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const rows = await factory('singleton').transaction(compileQuery, async (tx) => {
    return tx.query(
      `SELECT id, task, ranAt, batteryLevel, batteryState, lowPowerMode,
              deviceModel, deviceSystemName, deviceSystemVersion, isSimulator
       FROM backgroundTaskRun ORDER BY ranAt DESC LIMIT ?`,
      [limit]
    )
  })
  return rows as {
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
  }[]
}
