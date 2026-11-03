/**
 * Local device-only Drizzle database backed by @op-engineering/op-sqlite —
 * the same Hermes-compatible SQLite library Zero uses for its local device
 * cache on React Native (see on-zero/kv-store's native export). Lives in a
 * separate physical SQLite file (`.orez/local.sqlite`) that never syncs to
 * Zero and never leaves the device.
 *
 * node:sqlite / bun:sqlite can't run in the Hermes native bundle, so op-sqlite
 * is used instead. on web, op-sqlite isn't available, so every function is a
 * no-op (matching the disabled diagnostics screen).
 *
 * Uses drizzle directly from drizzle-orm/sqlite-proxy rather than
 * createSQLiteDatabase from @o/database/sqlite, because the latter imports
 * node:async_hooks at the top level which Hermes cannot resolve.
 */
import { open } from '@op-engineering/op-sqlite'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from './localSchema'
import { relations } from './localRelations'

type LocalDrizzle = ReturnType<typeof drizzle>

let db: ReturnType<typeof open> | null = null

function getDb() {
  if (!db) {
    db = open({ name: '.orez/local.sqlite' })
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
  return db
}

export const localDb = {
  transaction: <T>(work: (drizzle: LocalDrizzle) => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const database = getDb()
      database.transaction(async (tx) => {
        try {
          const localDrizzle = drizzle(async (sql, params, method) => {
            if (method === 'run') {
              const res = await tx.execute(sql, params)
              return { changes: res.rowsAffected, rows: [] }
            }
            const res = await tx.execute(sql, params)
            return { rows: res.rows }
          }, { schema, relations })
          const result = await work(localDrizzle)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    }),
}
