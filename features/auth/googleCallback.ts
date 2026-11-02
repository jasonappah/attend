import { parseSetCookieHeader } from 'better-auth/cookies'

// The nonce ties an Android deep link to the sign-in currently in progress.
// Ignore unrelated links instead of accepting an arbitrary session cookie.
export function googleCallbackToken(url: string, scheme: string, nonce: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== `${scheme}:` || parsed.searchParams.get('attempt') !== nonce) return null
  const cookie = parsed.searchParams.get('cookie')
  if (!cookie) return null
  for (const [name, value] of parseSetCookieHeader(cookie)) {
    if (name === `${scheme}.session_token` && value.value) {
      try {
        return decodeURIComponent(value.value)
      } catch {
        return null
      }
    }
  }
  return null
}
