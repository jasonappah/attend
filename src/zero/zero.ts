import { Zero } from '@rocicorp/zero'
import { createEmitter } from '@vxrn/emitter'
import { env } from '~/env'
import { kvStore } from '~/zero/kvStore'
import { mutators } from '~/zero/mutators'
import { schema } from '~/zero/schema'

export let zero = createZero()

const zeroEmitter = createEmitter<typeof zero>()
export const useZeroEmit = zeroEmitter.use

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
  zeroEmitter.emit(zero)
}
