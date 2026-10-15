import { mustGetMutator } from '@rocicorp/zero'
import { handleMutateRequest } from '@rocicorp/zero/server'
import type { Endpoint } from 'one'
import { dbProvider } from '~/zero/db-provider'
import { mutators } from '~/zero/mutators'
import { getZeroContext } from '~/zero/server-auth'

export const POST: Endpoint = async (req) => {
  const ctx = await getZeroContext(req)

  if (!ctx) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await handleMutateRequest({
    dbProvider,
    handler: (transact) =>
      transact((tx, name, args) => {
        const mutator = mustGetMutator(mutators, name)
        return mutator.fn({ args, tx, ctx })
      }),
    request: req,
    userID: ctx.userId,
  })

  return Response.json(result)
}
