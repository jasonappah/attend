import { nativeBearerClient } from './nativeBearerClient'
import { nativeBearerTokenStore } from './nativeTokenStore'

// native: persist the Better Auth bearer token in the keychain and send it on
// every request. Replaces @better-auth/expo's cookie-backed client.
export const platformAuthClientPlugins = [
  nativeBearerClient({ tokenStore: nativeBearerTokenStore }),
] as const
