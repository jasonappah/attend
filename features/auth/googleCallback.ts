import { parseSetCookieHeader } from 'better-auth/cookies'

// The nonce ties an Android deep link to the sign-in currently in progress.
// Ignore unrelated links instead of accepting an arbitrary session cookie.
export function isGoogleCallback(url: string, scheme: string, nonce: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === `${scheme}:` && parsed.searchParams.get('attempt') === nonce
}

export function googleCallbackToken(url: string, scheme: string, nonce: string): string | null {
  if (!isGoogleCallback(url, scheme, nonce)) return null
  const cookie = new URL(url).searchParams.get('cookie')
  if (!cookie) return null
  for (const [name, value] of parseSetCookieHeader(cookie)) {
    // Better Auth prefixes this cookie with `__Secure-` or `__Host-` whenever
    // secure cookies are on (always in production), so match its invariant
    // `.session_token` suffix instead of a name this app cannot predict.
    if (!name.endsWith('.session_token') || !value.value) continue
    try {
      return decodeURIComponent(value.value)
    } catch {
      return null
    }
  }
  return null
}
