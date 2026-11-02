import type { Endpoint } from 'one'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'

export const POST: Endpoint = async (request) => {
  const authData = await getZeroAuthData(authServer, request)
  if (!authData) return new Response('unauthorized', { status: 401 })
  return Response.json({ userID: authData.id, authData })
}
