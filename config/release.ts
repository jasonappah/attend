// Pure build configuration; safe to share without importing filesystem/server code.
export const APP_IDENTITIES = {
  development: { displayName: 'Attend (Dev)', bundleId: 'me.jasonaa.attend.dev' },
  preview: { displayName: 'Attend (Preview)', bundleId: 'me.jasonaa.attend.preview' },
  production: { displayName: 'Attend', bundleId: 'me.jasonaa.attend' },
} as const

export function nativeReleaseConfig(state: unknown, env: Record<string, string | undefined> = {}) {
  const variant = env.APP_VARIANT || 'development'
  if (!(variant in APP_IDENTITIES) || !Object.hasOwn(APP_IDENTITIES, variant)) {
    throw new Error(`invalid APP_VARIANT: ${variant}`)
  }
  const native = (
    state as { native?: { version?: unknown; build?: unknown; runtimeVersion?: unknown } }
  )?.native
  if (
    typeof native?.version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(native.version) ||
    typeof native.build !== 'number' ||
    !Number.isSafeInteger(native.build) ||
    native.build < 1 ||
    native.build > 2100000000 ||
    typeof native.runtimeVersion !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(native.runtimeVersion)
  )
    throw new Error('Invalid native release metadata')
  const base =
    env.UPDATES_URL || `https://${env.VITE_WEB_HOSTNAME || 'localhost:4200'}/api/updates/${variant}`
  const url = new URL(base)
  if (
    variant === 'production' &&
    (url.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(url.hostname))
  ) {
    throw new Error(
      'Production updates require an explicit HTTPS production origin (UPDATES_URL or VITE_WEB_HOSTNAME)'
    )
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith(`/api/updates/${variant}`)
  ) {
    throw new Error(`UPDATES_URL must end with /api/updates/${variant}, without query or fragment`)
  }
  return {
    variant: variant as keyof typeof APP_IDENTITIES,
    ...APP_IDENTITIES[variant as keyof typeof APP_IDENTITIES],
    version: native.version,
    build: native.build,
    runtimeVersion: native.runtimeVersion,
    updatesUrl: url.toString(),
  }
}
