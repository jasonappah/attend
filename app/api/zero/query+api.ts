import { mustGetQuery } from '@rocicorp/zero'
import { handleQueryRequest } from '@rocicorp/zero/server'
import type { Endpoint } from 'one'
import { queries } from '~/zero/queries'
import { schema } from '~/zero/schema'
import { getZeroContext } from '~/zero/server-auth'

export const POST: Endpoint = async (req) => {
  const ctx = await getZeroContext(req)

  const result = await handleQueryRequest({
    handler: (name, args) => {
      const query = mustGetQuery(queries, name)
      return query.fn({ args, ctx })
    },
    schema,
    request: req,
    userID: ctx?.userId ?? null,
  })

  return Response.json(result)
}
