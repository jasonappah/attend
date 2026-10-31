import { useEffect } from 'react'
import { setZeroAuth } from '../zero/zero'
import { useAuth } from './authClient'
import { useTauriDeepLink } from './useTauriDeepLink'

export const AuthEffects = () => {
  useTauriDeepLink()
  useAuthPassJWTSecretToZeroEffect()

  return null
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { token, user } = useAuth()

  useEffect(() => {
    if (user && token) {
      setZeroAuth({
        jwtToken: token,
        userID: user.id,
      })
    }
  }, [user, token])
}
