import { One } from 'one'
import type { NativeBearerTokenStore } from './nativeBearerClient'

const BEARER_TOKEN_KEY = 'attend.bearer_token'

// One's secure store is backed by the iOS keychain / Android Keystore, so the
// bearer token never lands in plain storage. Sync access keeps the fetch hook
// simple and avoids racing the first request.
export const nativeBearerTokenStore: NativeBearerTokenStore = {
  get() {
    return One.SecureStore.getItemSync(BEARER_TOKEN_KEY) ?? undefined
  },
  set(token) {
    One.SecureStore.setItemSync(BEARER_TOKEN_KEY, token)
  },
  remove() {
    One.SecureStore.deleteItemSync(BEARER_TOKEN_KEY)
  },
}
