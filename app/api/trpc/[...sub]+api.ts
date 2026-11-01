import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'
import { appRouter } from '~/features/trpc/router'

export default async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc', req, router: appRouter,
    createContext: async () => ({ userId: (await getZeroAuthData(authServer, req))?.id ?? null }),
  })
}
