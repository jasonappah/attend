import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { env } from '~/env'

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.ZERO_UPSTREAM_DB,
  },
})
