import { parseSetCookieHeader } from 'better-auth/cookies'
import { One } from 'one'
import { authClient } from './authClient'
import { nativeBearerTokenStore } from './nativeTokenStore'

const APP_SCHEME = 'attend'

function readSessionToken(setCookieHeader: string) {
  for (const [name, cookie] of parseSetCookieHeader(setCookieHeader)) {
    // match better-auth's invariant suffix rather than a hardcoded cookie name
    if (name.endsWith('.session_token') && cookie.value) {
      return decodeURIComponent(cookie.value)
    }
  }
  return null
}

/**
 * Native OAuth: ask Better Auth for the provider URL, open it in the system
 * browser, then recover the session token from the attend:// callback that
 * appSchemeRedirect decorated with the server's set-cookie header.
 */
export async function signInWithGoogle(callbackURL?: string) {
  const absoluteCallbackURL =
    callbackURL && /^[a-z][a-z0-9+.-]*:/i.test(callbackURL)
      ? callbackURL
      : `${APP_SCHEME}://`

  const { data, error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: absoluteCallbackURL,
    disableRedirect: true,
  })

  if (error) {
    console.error('Google sign-in failed', error)
    return
  }
  if (!data?.url) return

  const result = await One.Browser.openAuthSession(data.url, `${APP_SCHEME}://`)
  if (result.type !== 'success' || !result.url) return

  const cookie = new URL(result.url).searchParams.get('cookie')
  const token = cookie ? readSessionToken(cookie) : null

  if (token) {
    nativeBearerTokenStore.set(token)
    authClient.$store.notify('$sessionSignal')
  }
}
