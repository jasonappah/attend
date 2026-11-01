import { authClient } from '~/auth/client/authClient'
import { APP_HOME_HREF } from '~/features/app/routes'

export async function signInGoogle() {
  const result = await authClient.signIn.social({ provider: 'google', callbackURL: APP_HOME_HREF })
  if (result.error) throw new Error(result.error.message || 'Google sign-in failed')
}
