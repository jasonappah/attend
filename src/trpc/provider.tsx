import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './routers';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';
import { env } from '~/env';
import { QueryClient, defaultShouldDehydrateQuery, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { createTRPCClient, makeQueryClient, trpc } from './client';

export function TRPCProvider(
  props: PropsWithChildren,
) {
  const {children} = props;
  const queryClient = makeQueryClient();
  const [trpcClient] = useState(createTRPCClient);
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}