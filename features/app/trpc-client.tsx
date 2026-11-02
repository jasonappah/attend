import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { type ReactNode, useRef, useState } from 'react'
import { useAuth } from '~/auth/client/authClient'
import { SERVER_URL } from '~/constants'
import { getOnline } from '~/features/app/onlineState'
import type { CalendarRouter } from '../calendar/trpc'

export const trpc = createTRPCReact<CalendarRouter>()

// tRPC calls won't work at all while offline: this link rejects any query or
// mutation before it reaches the network when the device has no connection.
// The flag is kept in sync by OnlineProvider, mounted above this provider in
// app/_layout.tsx.
const offlineLink = () => (next: any) => (input: any) => {
  if (!getOnline()) {
    return Promise.reject(new Error('You appear to be offline'))
  }
  return next(input)
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const token = useRef(auth.session?.token)
  token.current = auth.session?.token
  const [queryClient] = useState(() => new QueryClient())
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        offlineLink(),
        httpBatchLink({
          url: `${SERVER_URL}/api/trpc`,
          headers: () => (token.current ? { Authorization: `Bearer ${token.current}` } : {}),
        }),
      ],
    })
  )
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
