import { Zero } from '@rocicorp/zero'
import { useSyncExternalStore } from 'react'
import { env } from '~/env'
import { kvStore } from '~/zero/kvStore'
import { mutators } from '~/zero/mutators'
import { schema } from '~/zero/schema'

export let zero = createZero()

const listeners = new Set<() => void>()

/**
 * Subscribe to the active Zero instance. The instance is replaced when auth
 * changes, and every subscriber re-renders with the new one.
 */
export function useZeroEmit() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => zero,
    () => zero,
  )
}

function createZero({ auth, userID = 'anon' }: { auth?: string; userID?: string } = {}) {
  const context = userID && userID !== 'anon' ? { userId: userID } : undefined
  return new Zero({
    userID,
    cacheURL: env.VITE_PUBLIC_ZERO_SERVER,
    auth,
    schema,
    mutators,
    context,
    kvStore,
  })
}

export function setZeroAuth({ jwtToken, userID }: { jwtToken: string; userID: string }) {
  zero = createZero({
    auth: jwtToken,
    userID,
  })
  for (const listener of listeners) listener()
}
