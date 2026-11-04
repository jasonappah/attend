/**
 * Local device-only Drizzle database backed by OP SQLite through `one` — the
 * same Hermes-compatible SQLite library Zero uses for its local device cache
 * on React Native. OP SQLite ships inside `one`, so we reach it through
 * `One.Database.open` instead of importing `@op-engineering/op-sqlite`
 * directly. Lives in a separate physical SQLite file (`.orez/local.sqlite`)
 * that never syncs to Zero and never leaves the device.
 *
 * This file is native-only (`.native.ts`): on web/server the no-op
 * `localDb.ts` is used instead, so OP SQLite (which reads
 * `NativeModules.OPSQLite.getConstants()` at import time) is never pulled into
 * the Cloudflare server build where `NativeModules` is undefined.
 *
 * Uses drizzle directly from drizzle-orm/sqlite-proxy rather than
 * createSQLiteDatabase from @o/database/sqlite, because the latter imports
 * node:async_hooks at the top level which Hermes cannot resolve.
 */
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { One } from 'one'
import { relations } from './localRelations'
import * as schema from './localSchema'

type LocalDrizzle = ReturnType<typeof drizzle>

let db: ReturnType<typeof One.Database.open> | null = null

function getDb() {
  if (!db) {
    db = One.Database.open({ name: '.orez/local.sqlite' })
    db.executeSync(`
      CREATE TABLE IF NOT EXISTS "backgroundTaskRun" (
        "id" TEXT PRIMARY KEY,
        "task" TEXT NOT NULL,
        "ranAt" INTEGER NOT NULL,
        "batteryLevel" INTEGER,
        "batteryState" TEXT,
        "lowPowerMode" INTEGER,
        "deviceModel" TEXT,
        "deviceSystemName" TEXT,
        "deviceSystemVersion" TEXT,
        "isSimulator" INTEGER
      )
    `)
  }
  return db!
}

export const localDb = {
  transaction: <T>(work: (drizzle: LocalDrizzle) => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const database = getDb()
      database.transaction(async (tx) => {
        try {
          const localDrizzle = drizzle(
            async (sql, params, method) => {
              if (method === 'run') {
                const res = await tx.execute(sql, params)
                return { changes: res.rowsAffected, rows: [] }
              }
              const res = await tx.execute(sql, params)
              return { rows: res.rows }
            },
            { schema, relations }
          )
          const result = await work(localDrizzle)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }),
}
