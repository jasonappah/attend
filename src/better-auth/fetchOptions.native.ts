export const BEARER_TOKEN_KEY = 'attend.bearer_token'

// native requests authenticate through the bearer fetch plugin instead, which
// reads the keychain-backed token from nativeTokenStore.
export const platformFetchOptions = {}
