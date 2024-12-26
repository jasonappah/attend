import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getRuntimeEnv = () => {
  // biome-ignore lint/nursery/noProcessEnv: loading from process.env to validate vars
  let runtimeEnv = process.env
  
  if (runtimeEnv.VERCEL) {
    runtimeEnv['VITE_ONE_SERVER_URL'] = `https://${runtimeEnv.VERCEL_URL}`
  }
  
  return runtimeEnv
}

export const env = createEnv({
  server: {
    ZERO_UPSTREAM_DB: z.string().url(),
    BETTER_AUTH_SECRET: z.string(),
    NODE_ENV: z.enum(["development", "production", "test"]),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_ONE_SERVER_URL: z.string().url(),
    VITE_PUBLIC_ZERO_SERVER: z.string().url(),
  },

  runtimeEnv: getRuntimeEnv(),

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
});
