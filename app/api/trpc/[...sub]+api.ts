import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'
import { calendarRouter } from '~/features/calendar/trpc'

export default async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc', req, router: calendarRouter,
    createContext: async () => ({ userId: (await getZeroAuthData(authServer, req))?.id ?? null }),
  })
}
