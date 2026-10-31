export const BEARER_TOKEN_KEY = 'attend.bearer_token'

// Tauri can't share the browser's cookies, so after login the browser hands it
// the session token via deep link (see AuthEffects) and we send it as a bearer
// token.
export function getStoredBearerToken() {
  try {
    return globalThis.localStorage?.getItem(BEARER_TOKEN_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export const platformFetchOptions = {
  auth: {
    type: 'Bearer' as const,
    token: getStoredBearerToken,
  },
}
