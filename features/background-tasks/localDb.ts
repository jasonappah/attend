/**
 * Direct access to a local SQLite database for background-task diagnostics.
 * this is a separate, non-synced database that lives alongside Zero's synced
 * database; rows written here never leave the device.
 *
 * on native, the database is backed by @op-engineering/op-sqlite — the same
 * Hermes-compatible SQLite library Zero uses for its local device cache on
 * React Native (see on-zero/kv-store's native export). queries go through
 * Drizzle, using a separate local schema and physical database file.
 * on web, op-sqlite isn't available, so every function is a no-op, matching
 * the disabled diagnostics screen.
 */

import { desc } from 'drizzle-orm'
import { One } from 'one'
import { isWeb } from 'tamagui'
import { localDb } from '~/database/localDb'
import * as schema from '~/database/localSchema'
import { uuidv7 } from '~/helpers/uuid'

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
    await localDb.transaction(async (drizzle) => {
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
  } catch (error) {
    // never let a recording failure take down the handler
    console.error('[background tasks] failed to record run', task, error)
  }
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  try {
    return await localDb.transaction(async (drizzle) => {
      return await drizzle
        .select()
        .from(schema.backgroundTaskRun)
        .orderBy(desc(schema.backgroundTaskRun.ranAt))
        .limit(limit)
    })
  } catch (error) {
    console.error('[background tasks] failed to list runs', error)
    return []
  }
}
