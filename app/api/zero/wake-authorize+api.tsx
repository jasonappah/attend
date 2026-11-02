import type { Endpoint } from 'one'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'

// authorizes a wake channel for an authenticated session. mirrors
// /api/zero/rust-auth so the sync host's authorizeWake path (and any local
// orez-lite authorizeWake callback) can validate a session instead of always
// refusing with 401.
export const POST: Endpoint = async (request) => {
  const authData = await getZeroAuthData(authServer, request)
  if (!authData) return new Response('unauthorized', { status: 401 })
  return Response.json({ userID: authData.id, authData })
}
