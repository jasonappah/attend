/**
 * Local device-only schema. These tables live in a separate physical SQLite
 * database (`.orez/local.sqlite`) that never syncs to Zero and never leaves
 * the device. Intended for diagnostic data such as background-task run logs.
 */
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// one row per background task run. written by the background-task handlers
// from a headless JavaScript launch, so this never leaves the device and is
// deliberately not part of the Zero schema: it is diagnostic data for
// observing how promptly the OS launches each task, exported through the
// diagnostics screen rather than synced.
export const backgroundTaskRun = sqliteTable('backgroundTaskRun', {
  id: text('id').primaryKey(),
  // the submitted task identifier, e.g. attend.background-task.every-minute
  task: text('task').notNull(),
  ranAt: integer('ranAt').notNull(),
  // system snapshot captured at the moment the task ran. batteryLevel is 0
  // to 1, or -1 when the device reports no level. batteryState is unknown,
  // unplugged, charging, full, or notCharging. lowPowerMode is Power Saver
  // on Android and Low Power Mode on iOS. device fields are the OS snapshot;
  // isSimulator is true only on simulator/emulator hardware.
  batteryLevel: integer('batteryLevel'),
  batteryState: text('batteryState'),
  lowPowerMode: integer('lowPowerMode', { mode: 'boolean' }),
  deviceModel: text('deviceModel'),
  deviceSystemName: text('deviceSystemName'),
  deviceSystemVersion: text('deviceSystemVersion'),
  isSimulator: integer('isSimulator', { mode: 'boolean' }),
})
