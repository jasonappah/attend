import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from '~/db/schema'
import { env } from '~/env'

export const db = drizzle(env.ZERO_UPSTREAM_DB, { relations })
export type Db = typeof db
