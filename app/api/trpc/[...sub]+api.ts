import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { Endpoint } from 'one'
import { createContext } from '~/trpc/context'
import { appRouter } from '~/trpc/routers'

const handler: Endpoint = async (req) => {
  return await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  })
}

export default handler
