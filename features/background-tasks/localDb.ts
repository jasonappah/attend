/**
 * Direct access to local storage for background-task diagnostics.
 * this is a separate, non-synced store that lives alongside Zero's synced
 * database; rows written here never leave the device.
 *
 * On native, records are stored through @o/helpers storage, which is backed
 * by MMKV (react-native-mmkv, initialized by setupStorage.ts). node:sqlite /
 * bun:sqlite aren't available in the Hermes native bundle, so MMKV is used
 * instead — each run is stored as a separate JSON key and listRuns reads all
 * run keys. On web, no storage driver is set up (setupStorage is native-only),
 * so every function is a no-op, matching the disabled diagnostics screen.
 */
import { createStorage } from '@o/helpers'
import { One } from 'one'
import { isWeb } from 'tamagui'
import { uuidv7 } from '~/helpers/uuid'

const store = createStorage<string, TaskRunRow>('background-task-runs')

export type SystemStatus = {
  batteryLevel: number
  batteryState: string
  lowPowerMode: boolean
  deviceModel: string
  deviceSystemName: string
  deviceSystemVersion: string
  isSimulator: boolean
}

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
    const run: TaskRunRow = {
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
    }
    store.set(run.id, run)
  } catch (error) {
    // never let a recording failure take down the handler
    console.error('[background tasks] failed to record run', task, error)
  }
}

export async function listRuns(limit = 200) {
  if (isWeb) return []
  try {
    const ids = store.keys()
    const runs = ids
      .map((id) => store.get(id))
      .filter((r): r is TaskRunRow => r != null)
      .sort((a, b) => (b.ranAt ?? 0) - (a.ranAt ?? 0))
      .slice(0, limit)
    return runs
  } catch (error) {
    console.error('[background tasks] failed to list runs', error)
    return []
  }
}
