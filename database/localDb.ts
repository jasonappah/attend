/**
 * Local device-only Drizzle database — web / server no-op.
 *
 * on native this is shadowed by `database/localDb.native.ts`, which opens a
 * real SQLite database through `One.Database.open` (OP SQLite, bundled inside
 * `one`). on web/server, OP SQLite isn't available and importing it would
 * crash the Cloudflare build (it reads `NativeModules.OPSQLite.getConstants()`
 * at module load time, but `NativeModules` is undefined outside a React Native
 * host), so this file imports nothing native and every operation is a no-op.
 *
 * `recordRun`/`listRuns` in `features/background-tasks/localDb.ts` return early
 * on web before reaching `transaction`, so this is never actually invoked
 * outside native. it throws only as a safety net.
 */
import type { drizzle } from 'drizzle-orm/sqlite-proxy'

type LocalDrizzle = ReturnType<typeof drizzle>

export const localDb = {
  transaction: async <T>(_work: (drizzle: LocalDrizzle) => Promise<T>): Promise<T> => {
    throw new Error('local database is only available on native')
  },
}
