import { zeroDrizzle } from '@rocicorp/zero/server/adapters/drizzle'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { relations } from '~/db/schema'
import { env } from '~/env'
import { schema } from '~/zero/schema'

const pool = new Pool({
  connectionString: env.ZERO_UPSTREAM_DB,
})

const drizzleDb = drizzle({ client: pool, relations })

export const dbProvider = zeroDrizzle(schema, drizzleDb)

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    dbProvider: typeof dbProvider
  }
}
