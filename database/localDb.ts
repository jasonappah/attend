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
 * queryAst is required by the SQLiteTransactionExecutor type but createSQLiteDrizzle
 * never calls it — it only uses exec/query through the drizzle() callback — so
 * it's a deliberate no-op.
 */
import 'server-only'
import {
  createSQLiteDatabase,
  type SQLiteTransactionExecutor,
  type SQLiteTransactionProvider,
} from '@o/database/sqlite'
import { open, type Scalar } from '@op-engineering/op-sqlite'
import { relations } from './localRelations'
import * as schema from './localSchema'

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

const transactionProvider: SQLiteTransactionProvider = async (work) => {
  const database = getDb()
  let result: unknown
  await database.transaction(async (tx) => {
    const executor: SQLiteTransactionExecutor = {
      exec: async (sql, params) => {
        const res = await tx.execute(sql, params ? ([...params] as Scalar[]) : [])
        return { changes: res.rowsAffected }
      },
      execMany: async (statements) => {
        return await Promise.all(
          statements.map(async ({ sql, params = [] }) => {
            const res = await tx.execute(sql, [...params] as Scalar[])
            return { changes: res.rowsAffected }
          })
        )
      },
      query: async <Row extends Record<string, unknown> = Record<string, unknown>>(
        sql: string,
        params?: readonly unknown[]
      ): Promise<Row[]> => {
        const res = await tx.execute(sql, params ? ([...params] as Scalar[]) : [])
        return res.rows as Row[]
      },
      // createSQLiteDrizzle only calls exec/query through the drizzle()
      // callback; queryAst is part of the executor type but never invoked.
      queryAst: async () => {
        throw new Error('queryAst is not supported on the local op-sqlite DB')
      },
    }
    result = await work(executor)
  })
  return result as unknown as ReturnType<typeof work>
}

export const localDb = createSQLiteDatabase({
  schema,
  relations,
  transactionProvider,
})
