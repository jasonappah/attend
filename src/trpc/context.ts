import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { auth } from '~/better-auth/auth'
import { db } from '~/db'

export async function createContext({ req, resHeaders, info }: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })
  return { req, resHeaders, session, info, db }
}

export type Context = Awaited<ReturnType<typeof createContext>>
