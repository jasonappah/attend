// Pure mapping: only the active launch snapshot is accepted. In particular,
// downloaded/staged manifests must never be passed as the running manifest.
export type ReleaseInfoInput = {
  platform: 'web' | 'native'
  development?: boolean
  compiled?: { releaseVersion?: unknown; gitSha?: unknown; variant?: unknown }
  appInfo?: { version?: unknown; build?: unknown } | null
  updates?: {
    isEmbeddedLaunch?: unknown
    runtimeVersion?: unknown
    updateId?: unknown
    manifest?: unknown
  } | null
}

const UNKNOWN = 'Unknown'
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][\da-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][\da-zA-Z-]*))*)?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/

function text(value: unknown): string | undefined {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !/\s/.test(value) &&
    ![...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    ? value
    : undefined
}

function version(value: unknown): string | undefined {
  const result = text(value)
  return result && SEMVER.test(result) ? result : undefined
}

function sha(value: unknown): string | undefined {
  return typeof value === 'string' && /^[\da-f]{40}$/i.test(value) ? value : undefined
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

export function resolveReleaseInfo(input: ReleaseInfoInput) {
  const web = input.platform === 'web'
  const embedded = input.updates?.isEmbeddedLaunch === true
  const metadata = record(record(input.updates?.manifest)?.metadata)
  // A missing bridge is not proof of an embedded launch. Likewise, disabled
  // updates do not establish which software is running.
  const source = web || embedded ? record(input.compiled) : metadata
  const releaseVersion = version(source?.releaseVersion) ?? UNKNOWN
  const gitSha = sha(source?.gitSha ?? source?.commitSha ?? source?.commit) ?? UNKNOWN
  const variant = text(source?.variant) ?? UNKNOWN
  // Installed marketing versions are platform strings, not necessarily semver.
  const installedVersion = text(input.appInfo?.version) ?? UNKNOWN
  const build = text(input.appInfo?.build)
  const installedBuild = build && /^\d+(?:\.\d+)*$/.test(build) ? build : UNKNOWN
  const development = input.development ? ' (Development)' : ''
  const runningSoftware = `${releaseVersion}${development}`

  return {
    platform: input.platform,
    installedApp: `${installedVersion} (build ${installedBuild})`,
    runningSoftware,
    releaseVersion,
    gitSha,
    variant,
    runtimeVersion: web ? 'Not applicable' : (text(input.updates?.runtimeVersion) ?? UNKNOWN),
    updateId: web ? 'Not applicable' : (text(input.updates?.updateId) ?? UNKNOWN),
    launch: web ? 'Web' : embedded ? 'Embedded' : metadata ? 'OTA' : UNKNOWN,
  }
}

export type ReleaseInfo = ReturnType<typeof resolveReleaseInfo>

export function releaseInfoLines(info: ReleaseInfo): string[] {
  return [
    ...(info.platform === 'native' ? [`Installed app: ${info.installedApp}`] : []),
    `Running software: ${info.runningSoftware}`,
  ]
}
