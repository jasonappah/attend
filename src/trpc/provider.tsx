import {
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { type PropsWithChildren, useState } from 'react'
import superjson from 'superjson'
import { createTRPCClient, makeQueryClient, trpc } from './client'

export function TRPCProvider(props: PropsWithChildren) {
  const { children } = props
  const queryClient = makeQueryClient()
  const [trpcClient] = useState(createTRPCClient)
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
