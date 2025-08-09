import { Zero } from '@rocicorp/zero'
import { createEmitter } from '@vxrn/emitter'
import { env } from '~/env'
import { schema } from '~/zero/schema'
import { expoSQLiteStoreProvider } from "@rocicorp/zero/expo";
import {isWeb} from 'tamagui'

const storeProvider = expoSQLiteStoreProvider();
export let zero = createZero()

const zeroEmitter = createEmitter<typeof zero>()
export const useZeroEmit = zeroEmitter.use


function createZero({ auth, userID = 'anon' }: { auth?: string; userID?: string } = {}) {
  return new Zero({
    userID,
    server: env.VITE_PUBLIC_ZERO_SERVER,
    auth,
    schema,
    kvStore: isWeb ? 'idb' : storeProvider,
  })
}

export function setZeroAuth({ jwtToken, userID }: { jwtToken: string; userID: string }) {
  zero = createZero({
    auth: jwtToken,
    userID,
  })
  zeroEmitter.emit(zero)
}

