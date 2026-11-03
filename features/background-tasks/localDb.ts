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
import { createLocalApplicationSqlClientFactory } from 'orez-lite/local'
import { uuidv7 } from '~/helpers/uuid'

const factory = createLocalApplicationSqlClientFactory({ dataDir: '.orez/application-sql' })

const compileQuery = (() => {
  throw new Error('localDb does not support Drizzle AST queries')
}) as any

export async function recordRun(task: string) {
  await factory('singleton').transaction(compileQuery, async (tx) => {
    await tx.exec(
      'INSERT INTO backgroundTaskRun (id, task, ranAt) VALUES (?, ?, ?)',
      [uuidv7(), task, Date.now()]
    )
  })
}

export async function listRuns(limit = 200) {
  const rows = await factory('singleton').transaction(compileQuery, async (tx) => {
    return tx.query(
      'SELECT id, task, ranAt FROM backgroundTaskRun ORDER BY ranAt DESC LIMIT ?',
      [limit]
    )
  })
  return rows as { id: string; task: string; ranAt: number }[]
}
