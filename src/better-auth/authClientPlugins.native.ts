import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

// native: persist the session in the keychain and handle the attend:// OAuth redirect
export const platformAuthClientPlugins = [
  expoClient({
    scheme: 'attend',
    storagePrefix: 'attend',
    storage: SecureStore,
  }),
] as const
