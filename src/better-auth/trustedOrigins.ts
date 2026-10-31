function loopbackOrigin(request: Request | undefined): string | null {
  const value = request?.headers.get('origin')
  if (!value) return null

  try {
    const origin = new URL(value)
    const hostname = origin.hostname.replace(/^\[|\]$/g, '').toLowerCase()

    if (origin.protocol !== 'http:' && origin.protocol !== 'https:') return null
    if (
      hostname !== 'localhost' &&
      !hostname.endsWith('.localhost') &&
      hostname !== '0.0.0.0' &&
      hostname !== '::1' &&
      !/^127(?:\.\d{1,3}){3}$/.test(hostname)
    ) {
      return null
    }

    return origin.origin
  } catch {
    return null
  }
}

/**
 * Trust the configured origins plus whatever loopback origin the dev server is
 * currently running on. Without this, opening the app on another local port
 * makes Better Auth reject the session request as an untrusted origin.
 */
export function trustedAppOrigins(origins: string[]) {
  return (request?: Request): string[] => {
    const origin = loopbackOrigin(request)
    return origin ? [...new Set([...origins, origin])] : origins
  }
}
