import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './routers';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import { env } from '~/env';
import { QueryClient, defaultShouldDehydrateQuery, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

export const trpc = createTRPCReact<AppRouter>();

export const createTRPCClient = () => { 
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${env.VITE_ONE_SERVER_URL}/api/trpc`,
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
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
