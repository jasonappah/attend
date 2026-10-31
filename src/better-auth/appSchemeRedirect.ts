import { createAuthMiddleware } from 'better-auth/api'
import type { BetterAuthPlugin } from 'better-auth'

/**
 * Better Auth's Expo plugin used to do this for native apps: after an OAuth
 * callback it appends the session `set-cookie` header to the app-scheme
 * redirect so the client can recover the session token. We no longer use
 * Expo, but the server-side behavior is still exactly what a native client
 * needs, so it lives here as a small standalone plugin.
 */
export function appSchemeRedirect(scheme: string): BetterAuthPlugin {
  const protocol = `${scheme}:`

  return {
    id: 'app-scheme-redirect',
    hooks: {
      after: [
        {
          matcher(context) {
            return Boolean(
              context.path?.startsWith('/callback') ||
                context.path?.startsWith('/magic-link/verify') ||
                context.path?.startsWith('/verify-email')
            )
          },
          handler: createAuthMiddleware(async (ctx) => {
            const headers = ctx.context.responseHeaders
            const location = headers?.get('location')
            if (!location) return

            let redirectURL: URL
            try {
              redirectURL = new URL(location)
            } catch {
              return
            }

            // only rewrite redirects that are actually going back to the app
            if (redirectURL.protocol !== protocol) return

            const cookie = headers?.get('set-cookie')
            if (!cookie) return

            redirectURL.searchParams.set('cookie', cookie)
            ctx.setHeader('location', redirectURL.toString())
          }),
        },
      ],
    },
  }
}
