import { authClient } from './authClient'

export async function signInWithGoogle(callbackURL?: string) {
  return authClient.signIn.social({
    provider: 'google',
    callbackURL,
  })
}
