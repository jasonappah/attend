import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { useAuth } from '~/auth/client/authClient'
import { SERVER_URL } from '~/constants'
import type { AppRouter } from './router'

export const trpc = createTRPCReact<AppRouter>()

export function TRPCProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const token = useRef(auth.session?.token)
  token.current = auth.session?.token
  const [queryClient] = useState(() => new QueryClient())
  const [client] = useState(() => trpc.createClient({
    links: [httpBatchLink({
      url: `${SERVER_URL}/api/trpc`,
      headers: () => token.current ? { Authorization: `Bearer ${token.current}` } : {},
    })],
  }))
  return <trpc.Provider client={client} queryClient={queryClient}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></trpc.Provider>
}
