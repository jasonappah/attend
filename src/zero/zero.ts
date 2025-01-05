import { type Query, type QueryType, type Smash, Zero } from '@rocicorp/zero'
import { useZero, useQuery, createUseZero } from '@rocicorp/zero/react'
import { createEmitter } from '@vxrn/emitter'
import { env } from '~/env'
import { type Schema, schema } from '~/zero/schema'

export let zero = createZero()

const zeroEmitter = createEmitter<typeof zero>()
export const useZeroEmit = zeroEmitter.use

function createZero({ auth, userID = 'anon' }: { auth?: string; userID?: string } = {}) {
  return new Zero({
    userID,
    auth,
    server: env.VITE_PUBLIC_ZERO_SERVER,
    schema,
    kvStore: 'mem',
  })
}

export function setZeroAuth({ jwtToken, userID }: { jwtToken: string; userID: string }) {
  zero = createZero({
    auth: jwtToken,
    userID,
  })
  zeroEmitter.emit(zero)
}

export type QueryResult<TReturn extends QueryType> = [
  Smash<TReturn>,
  {
    type: 'unknown' | 'complete'
  },
]

export function useZeroQuery<
  QueryBuilder extends (z: Zero<Schema>['query']) => Query<any, any>,
  Q extends ReturnType<QueryBuilder>,
>(createQuery: QueryBuilder): Q extends Query<any, infer Return> ? QueryResult<Return> : never {
  const z = useZero<Schema>()
  return useQuery(createQuery(z.query)) as any
}