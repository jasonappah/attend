import { One } from 'one'
import { Linking } from 'react-native'
import { reestablishAuthSession } from 'takeout-better-auth'
import { showToast } from 'takeout-ui/toast/Toast'
import { authClient, nativeTokenStore } from '~/auth/client/authClient'
import { APP_SCHEME, SERVER_URL } from '~/constants'
import { uuidv7 } from '~/helpers/uuid'
import { googleCallbackToken, isGoogleCallback } from './googleCallback'

// Android's Custom Tab fallback can send the deep link after the browser
// promise has already resolved as cancelled. Keep one nonce-bound listener
// alive for that return; a new attempt always invalidates the previous one.
let cancelPending: (() => void) | undefined

export async function signInGoogle() {
  cancelPending?.()
  const nonce = uuidv7()
  const callbackURL = `${APP_SCHEME}://?attempt=${nonce}`
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL,
    disableRedirect: true,
  })
  if (result.error) throw new Error(result.error.message || 'Google sign-in failed')
  if (!result.data?.url) throw new Error('Google sign-in URL was not returned')
  const expected = await nativeTokenStore.get()
  const proxy = new URL('/api/auth/expo-authorization-proxy', SERVER_URL)
  proxy.searchParams.set('authorizationURL', result.data.url)

  let settled = false
  const finish = async (url: string) => {
    // Ignore links that belong to another app or another attempt, but never
    // ignore our own callback: a callback we cannot read a session from used to
    // leave the user on the sign-in screen with no explanation at all.
    if (settled || !isGoogleCallback(url, APP_SCHEME, nonce)) return
    settled = true
    cleanup()
    const token = googleCallbackToken(url, APP_SCHEME, nonce)
    if (!token) throw new Error('Google sign-in returned no session. Please try again.')
    if (!(await nativeTokenStore.set(token, expected)))
      throw new Error('The sign-in was superseded by another account change.')
    try {
      await reestablishAuthSession(authClient)
    } catch (error) {
      await nativeTokenStore.remove(token)
      throw error
    }
  }
  const subscription = Linking.addEventListener('url', ({ url }) => {
    void finish(url).catch(() => showToast('Google sign-in failed. Please try again.'))
  })
  const timer = setTimeout(() => cleanup(), 5 * 60_000)
  function cleanup() {
    subscription.remove()
    clearTimeout(timer)
    if (cancelPending === cleanup) cancelPending = undefined
  }
  cancelPending = cleanup
  try {
    const response = await One.Browser.openAuthSession(proxy.toString(), callbackURL)
    if (response.type === 'success') await finish(response.url)
  } catch (error) {
    cleanup()
    throw error
  }
}
