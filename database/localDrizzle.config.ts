import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './database/localSchema.ts',
  out: './database/localMigrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.orez/local.sqlite',
  },
  strict: true,
})
