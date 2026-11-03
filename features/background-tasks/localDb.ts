import type { SQLiteTransactionProvider } from '@o/database/sqlite'
import { createSQLiteDatabase } from '@o/database/sqlite'
import { createQueryCompiler } from 'orez-lite/cloudflare/query-compiler'
import { createLocalApplicationSqlClientFactory } from 'orez-lite/local'
import { relations } from '~/database/relations'
import * as schema from '~/database/schema'

// the application SQLite database outside Zero: private diagnostic rows that
// never sync and live only on this device. the background-task handlers write
// here from a headless JavaScript launch, so unlike ~/database/db this module
// has no `server-only` marker and stays importable on native. it opens the
// same application-sql database orez-lite already manages for the app.
const factory = createLocalApplicationSqlClientFactory({ dataDir: '.orez/application-sql' })
const compileQuery = createQueryCompiler(schema)

export const transactionProvider: SQLiteTransactionProvider = (work) =>
  factory('singleton').transaction(compileQuery, work)

export const db = createSQLiteDatabase({ schema, relations, transactionProvider })
