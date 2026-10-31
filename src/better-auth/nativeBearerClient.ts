import type { BetterAuthClientPlugin } from 'better-auth/client'

export interface NativeBearerTokenStore {
  get(): string | undefined
  set(token: string): void
  remove(): void
}

export interface NativeBearerClientOptions {
  tokenStore: NativeBearerTokenStore
}

/**
 * Native clients can't rely on cookies surviving the React Native fetch
 * boundary, so Better Auth's bearer plugin issues a `set-auth-token` header
 * and we send it back as an Authorization header. This replaces
 * `@better-auth/expo`'s cookie-backed client without pulling Expo back in.
 */
export function nativeBearerClient(options: NativeBearerClientOptions) {
  return {
    id: 'native-bearer',
    fetchPlugins: [
      {
        id: 'native-bearer',
        name: 'native bearer',
        hooks: {
          async onRequest(context: {
            headers: Headers
            credentials?: RequestCredentials
          }) {
            context.credentials = 'omit'

            const token = options.tokenStore.get()
            if (token && !context.headers.has('authorization')) {
              context.headers.set('authorization', `Bearer ${token}`)
            }
          },
          async onSuccess(context: {
            request: { url: URL | string }
            response: Response
          }) {
            const requestPath = new URL(
              context.request.url.toString(),
              'https://better-auth.invalid'
            ).pathname

            if (requestPath.endsWith('/sign-out')) {
              options.tokenStore.remove()
              return
            }

            const token = context.response.headers.get('set-auth-token')
            if (token) options.tokenStore.set(token)
          },
          async onError(context: {
            request: { headers: Headers }
            error: { status: number }
          }) {
            if (context.error.status === 401) {
              options.tokenStore.remove()
            }
          },
        },
      },
    ],
  } satisfies BetterAuthClientPlugin
}
