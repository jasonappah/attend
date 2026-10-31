import { jwtClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { getURL } from 'one'
import { useEffect, useState } from 'react'
import { platformAuthClientPlugins } from './authClientPlugins'
import { BEARER_TOKEN_KEY, platformFetchOptions } from './fetchOptions'

export const authClient = createAuthClient({
  baseURL: `${getURL()}/api/auth`,
  plugins: [jwtClient(), ...platformAuthClientPlugins],
  fetchOptions: platformFetchOptions,
})

export function setAuthClientToken({ session }: { session: string }) {
  localStorage.setItem(BEARER_TOKEN_KEY, session)
  // re-fetch so useSession picks up the new bearer token
  authClient.$store.notify('$sessionSignal')
}

// the JWT is what zero authenticates with; cache it per session so every useAuth()
// caller shares one request
let jwtCache: { sessionId: string; token: Promise<string | null> } | null = null

function getJWT(sessionId: string) {
  if (jwtCache?.sessionId !== sessionId) {
    jwtCache = {
      sessionId,
      token: authClient.token().then(({ data, error }) => {
        if (error) console.error('Error fetching auth JWT', error)
        return data?.token ?? null
      }),
    }
  }
  return jwtCache.token
}

export function useAuth() {
  const { data, isPending } = authClient.useSession()
  const sessionId = data?.session.id
  const [jwt, setJWT] = useState<{ sessionId: string; token: string | null } | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    getJWT(sessionId).then((token) => {
      if (!cancelled) setJWT({ sessionId, token })
    })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    token: sessionId && jwt?.sessionId === sessionId ? jwt.token : null,
    loggedIn: !!data?.user,
    isPending,
  }
}
