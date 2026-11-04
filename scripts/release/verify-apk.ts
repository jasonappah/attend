import { execFileSync } from 'bun:child_process'
import { readdirSync, readFileSync, statSync } from 'bun:fs'
import { join } from 'bun:path'
import { nativeReleaseConfig } from '../../config/release'

// The published production APK is signed by this certificate. Rotating the
// signing key is a deliberate, visible change to this value.
export const PRODUCTION_ANDROID_SIGNER_SHA256 =
  '9a34d0a09078dff2a36257175e349e877359eac686c7d5e16c8cfa8aa4e67955'

export function sdkTool(name: string) {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!home) throw new Error('ANDROID_HOME is required to inspect the APK')
  const dir = join(home, 'build-tools')
  const versions = readdirSync(dir).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  for (const version of versions) {
    const candidate = join(dir, version, name)
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {}
  }
  throw new Error(`Android build-tool ${name} not found under ${dir}`)
}

export type ApkIdentity = {
  applicationId: string
  versionName: string
  versionCode: number
  abis: string[]
  signerSha256: string
}

export function readApkIdentity(apk: string): ApkIdentity {
  const badging = execFileSync(sdkTool('aapt'), ['dump', 'badging', apk], {
    encoding: 'utf8',
  })
  const pkg = badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m)
  if (!pkg) throw new Error('APK package identity is unreadable')
  const abis = [...badging.matchAll(/^native-code: '([^']+)'/gm)]
    .flatMap((match) => match[1]!.split(/\s+/))
    .filter(Boolean)
  const certs = execFileSync(sdkTool('apksigner'), ['verify', '--print-certs', apk], {
    encoding: 'utf8',
  })
  const signer = certs.match(/certificate SHA-256 digest: ([a-f0-9]{64})/i)
  if (!signer) throw new Error('APK signing certificate is unreadable')
  return {
    applicationId: pkg[1]!,
    versionCode: Number(pkg[2]!),
    versionName: pkg[3]!,
    abis: [...new Set(abis)],
    signerSha256: signer[1]!.toLowerCase(),
  }
}

export function verifyApk(apk: string, state: unknown, env = process.env) {
  const expected = nativeReleaseConfig(state, { ...env, APP_VARIANT: 'production' })
  const actual = readApkIdentity(apk)
  const failures: string[] = []
  if (actual.applicationId !== expected.bundleId)
    failures.push(`application id ${actual.applicationId} != ${expected.bundleId}`)
  if (actual.versionName !== expected.version)
    failures.push(`version name ${actual.versionName} != ${expected.version}`)
  if (actual.versionCode !== expected.build)
    failures.push(`version code ${actual.versionCode} != ${expected.build}`)
  if (!actual.abis.includes('armeabi-v7a'))
    failures.push(`missing armeabi-v7a (found ${actual.abis.join(', ') || 'none'})`)
  const signer = env.EXPECTED_ANDROID_SIGNER_SHA256 || PRODUCTION_ANDROID_SIGNER_SHA256
  if (actual.signerSha256 !== signer)
    failures.push(`signer ${actual.signerSha256} != expected ${signer}`)
  if (failures.length)
    throw new Error(`Release APK is not installable as intended:\n- ${failures.join('\n- ')}`)
  return actual
}

if (import.meta.main) {
  try {
    const apk = process.argv[2]
    if (!apk) throw new Error('Usage: bun scripts/release/verify-apk.ts <apk>')
    const result = verifyApk(apk, JSON.parse(readFileSync('release.json', 'utf8')))
    console.log(JSON.stringify(result))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
