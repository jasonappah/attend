import { createReplicacheExpoSQLiteKVStore } from '@react-native-replicache/react-native-expo-sqlite'
import { type Query, Zero } from '@rocicorp/zero'
import { useZero, useQuery as useZeroQuery } from '@rocicorp/zero/react'
import { createEmitter } from '@vxrn/emitter'
import { env } from '~/env'
import { type Schema, schema } from '~/zero/schema'
import { isWeb } from 'tamagui'

export let zero = createZero()

const zeroEmitter = createEmitter<typeof zero>()
export const useZeroEmit = zeroEmitter.use

function createZero({ auth, userID = 'anon' }: { auth?: string; userID?: string } = {}) {
  return new Zero({
    userID,
    auth,
    server: env.VITE_PUBLIC_ZERO_SERVER,
    schema,
    // TODO: use lazy import for expo sqlite on web or try to get op sqlite working so we can use same kv store for web and native
    // kvStore: isWeb ? 'idb' : createReplicacheExpoSQLiteKVStore,
    kvStore: 'idb',
  })
}

export function setZeroAuth({ jwtToken, userID }: { jwtToken: string; userID: string }) {
  zero = createZero({
    auth: jwtToken,
    userID,
  })
  zeroEmitter.emit(zero)
}

export function useQuery<
  TSchema extends Schema,
  TTable extends keyof TSchema['tables'] & string,
  TReturn,
>(createQuery: (z: Zero<TSchema>['query']) => Query<TSchema, TTable, TReturn>, enable?: boolean) {
  const z = useZero<TSchema>()
  z.query
  return useZeroQuery<TSchema, TTable, TReturn>(createQuery(z.query), enable)
}