import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    ZERO_UPSTREAM_DB: z.string().url(),
    BETTER_AUTH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_PUBLIC_ZERO_SERVER: z.string().url(),
  },
  shared: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    ONE_SERVER_URL: z.string().url(),
  },

  runtimeEnvStrict: {
    ZERO_UPSTREAM_DB: process.env.ZERO_UPSTREAM_DB,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    VITE_PUBLIC_ZERO_SERVER: process.env.VITE_PUBLIC_ZERO_SERVER,
    NODE_ENV: process.env.NODE_ENV,
    ONE_SERVER_URL: process.env.ONE_SERVER_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})
