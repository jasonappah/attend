import { parseSetCookieHeader } from 'better-auth/cookies'
import { One } from 'one'
import { authClient, nativeTokenStore } from '~/auth/client/authClient'
import { APP_SCHEME } from '~/constants'

export async function signInGoogle() {
  const expected = await nativeTokenStore.get()
  const callbackURL = `${APP_SCHEME}://`
  const result = await authClient.signIn.social({ provider: 'google', callbackURL, disableRedirect: true })
  if (result.error) throw new Error(result.error.message || 'Google sign-in failed')
  if (!result.data?.url) throw new Error('Google sign-in URL was not returned')
  const response = await One.Browser.openAuthSession(result.data.url, callbackURL)
  if (response.type !== 'success' || !response.url) return
  const cookie = new URL(response.url).searchParams.get('cookie')
  if (!cookie) throw new Error('Google sign-in did not return a session')
  for (const [name, value] of parseSetCookieHeader(cookie)) {
    if (name.endsWith('.session_token') && value.value) {
      if (await nativeTokenStore.set(decodeURIComponent(value.value), expected)) authClient.$store.notify('$sessionSignal')
      return
    }
  }
  throw new Error('Google sign-in did not return a session')
}
