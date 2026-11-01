import 'server-only'
import { createSQLiteDatabase } from '@o/database/sqlite'
import { zeroExecutor } from '~/data/zero-server'
import { relations } from './relations'
import * as schema from './schema'

// Server-side jobs must use the sync executor, not the raw application DB:
// it records their writes in the Zero change ledger before committing.
export function syncedDb(userId: string) {
  return createSQLiteDatabase({
    schema,
    relations,
    transactionProvider: (work) => zeroExecutor.transaction({ userID: userId }, async (tx) => {
      const wrapped = tx.dbTransaction.wrappedTransaction
      return work({
        exec: (sql, params) => wrapped.exec(sql, params),
        execMany: async (statements) => {
          const results = []
          for (const statement of statements) results.push(await wrapped.exec(statement.sql, statement.params))
          return results
        },
        query: async (sql, params) => [...await wrapped.query(sql, params)] as any,
        queryAst: (ast, format, name) => wrapped.queryAst(ast as any, format, name),
      })
    }),
  })
}
