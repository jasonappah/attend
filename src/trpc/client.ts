import {
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { type PropsWithChildren, useState } from 'react'
import superjson from 'superjson'
import { env } from '~/env'
import type { AppRouter } from './routers'

export const trpc = createTRPCReact<AppRouter>()

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `http://localhost:8081/api/trpc`,
        transformer: superjson,
      }),
    ],
  })
}

export const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  })
}
