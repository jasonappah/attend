import { useNetworkState } from 'one'
import { useEffect } from 'react'
import { setOnline } from './onlineState'

/**
 * Keeps the module-level `online` flag in sync with One's network monitor so
 * non-hook consumers (the tRPC link, direct Zero mutation calls) can read it.
 * Mount once, above TRPCProvider, in app/_layout.tsx.
 */
export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const { type } = useNetworkState()
  useEffect(() => {
    setOnline(type !== 'none')
  }, [type])
  return <>{children}</>
}
