import { createLocalJWKSet, jwtVerify } from 'jose'
import { auth } from '~/better-auth/auth'
import { env } from '~/env'
import type { Context } from './auth'

let cachedJWKS: ReturnType<typeof createLocalJWKSet> | null = null

async function getJWKS() {
  if (cachedJWKS) return cachedJWKS
  const res = await auth.handler(
    new Request(`${env.ONE_SERVER_URL}/api/auth/jwks`)
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS: ${res.status}`)
  }
  const { keys } = (await res.json()) as { keys: Parameters<typeof createLocalJWKSet>[0]['keys'] }
  cachedJWKS = createLocalJWKSet({ keys })
  return cachedJWKS
}

async function verifyJWT(token: string): Promise<string | null> {
  try {
    const JWKS = await getJWKS()
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.ONE_SERVER_URL,
      audience: env.ONE_SERVER_URL,
    })
    if (typeof payload.sub === 'string' && payload.sub) return payload.sub
    if (typeof payload.id === 'string' && payload.id) return payload.id
    return null
  } catch {
    cachedJWKS = null
    return null
  }
}

/**
 * Derive the Zero Context from an incoming query/mutate request.
 *
 * Zero forwards the client's `auth` token as an `Authorization: Bearer <token>`
 * header (and forwards cookies when ZERO_*_FORWARD_COOKIES is enabled).
 * We accept either a better-auth session (cookie or bearer session token)
 * or the long-lived JWT issued by the better-auth jwt plugin
 * (what the client currently passes as Zero `auth`).
 */
export async function getZeroContext(request: Request): Promise<Context> {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null)
  if (session?.user) {
    return { userId: session.user.id }
  }

  const header = request.headers.get('authorization') ?? request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (token) {
    const userId = await verifyJWT(token)
    if (userId) return { userId }
  }

  return undefined
}
