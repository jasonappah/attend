import { describe, expect, test } from 'bun:test'
import { type ReleaseInfoInput, releaseInfoLines, resolveReleaseInfo } from './releaseInfo'

const compiled = {
  releaseVersion: '1.1.371',
  gitSha: 'a'.repeat(40),
  variant: 'production',
}
const native: ReleaseInfoInput = {
  platform: 'native',
  compiled,
  appInfo: { version: '1.1.371', build: '2' },
  updates: { isEmbeddedLaunch: true, runtimeVersion: 'attend-2', updateId: 'embedded-2' },
}

describe('release identity', () => {
  test('embedded software and installed binary have distinct explicit labels', () => {
    const info = resolveReleaseInfo(native)
    expect(releaseInfoLines(info)).toEqual([
      'Installed app: 1.1.371 (build 2)',
      'Running software: 1.1.371',
    ])
    expect(info.gitSha).toBe(compiled.gitSha)
    expect(info.launch).toBe('Embedded')
    expect(info.runtimeVersion).toBe('attend-2')
  })

  test('OTA reads the active metadata, not compiled binary release or SHA', () => {
    const info = resolveReleaseInfo({
      ...native,
      updates: {
        ...native.updates,
        isEmbeddedLaunch: false,
        manifest: {
          metadata: { releaseVersion: '1.2.0', gitSha: 'b'.repeat(40), variant: 'staging' },
        },
      },
    })
    expect(info.installedApp).toBe('1.1.371 (build 2)')
    expect(info.runningSoftware).toBe('1.2.0')
    expect(info.gitSha).toBe('b'.repeat(40))
    expect(info.variant).toBe('staging')
    expect(info.launch).toBe('OTA')
  })

  test('staging a newer manifest and failed update checks cannot change running identity', () => {
    const updates = {
      isEmbeddedLaunch: false,
      manifest: { metadata: { releaseVersion: '1.2.0' } },
      staged: null as unknown,
      checkError: null as unknown,
    }
    const before = resolveReleaseInfo({ ...native, updates })
    updates.staged = { metadata: { releaseVersion: '9.0.0' } }
    updates.checkError = new Error('Offline')
    expect(resolveReleaseInfo({ ...native, updates })).toEqual(before)
  })

  test('web reports the deployed build version and commit, not a native identity', () => {
    const info = resolveReleaseInfo({ platform: 'web', compiled })
    expect(releaseInfoLines(info)).toEqual(['Running software: 1.1.371'])
    expect(info.gitSha).toBe(compiled.gitSha)
    expect(info.runtimeVersion).toBe('Not applicable')
    expect(info.updateId).toBe('Not applicable')
  })

  test('development is visibly labeled without pretending to be a release build', () => {
    expect(resolveReleaseInfo({ ...native, development: true }).runningSoftware).toBe(
      '1.1.371 (Development)'
    )
    expect(
      resolveReleaseInfo({ platform: 'web', development: true, compiled }).runningSoftware
    ).toBe('1.1.371 (Development)')
  })

  test('missing native bridges never guess from the compiled package release', () => {
    const info = resolveReleaseInfo({ platform: 'native', compiled })
    expect(info.installedApp).toBe('Unknown (build Unknown)')
    expect(info.runningSoftware).toBe('Unknown')
    expect(info.gitSha).toBe('Unknown')
  })

  test('disabled bridge without an embedded confirmation remains unknown', () => {
    expect(
      resolveReleaseInfo({ ...native, updates: { isEmbeddedLaunch: false } }).runningSoftware
    ).toBe('Unknown')
    // Disabled update fetching does not invalidate a confirmed embedded launch.
    expect(resolveReleaseInfo(native).runningSoftware).toBe('1.1.371')
  })

  test.each([null, {}, [], { metadata: null }, { metadata: [] }].map((manifest) => ({ manifest })))(
    'legacy/missing active manifest %j does not fall back to compiled metadata',
    ({ manifest }) => {
      const info = resolveReleaseInfo({
        ...native,
        updates: { isEmbeddedLaunch: false, manifest },
      })
      expect(info.runningSoftware).toBe('Unknown')
      expect(info.gitSha).toBe('Unknown')
    }
  )

  test.each(
    [undefined, null, 123, true, {}, [], '', '1.2', '01.2.3', '1.2.3\n', '1.2.3-01'].map(
      (releaseVersion) => ({ releaseVersion })
    )
  )('invalid metadata scalar %j is not a software version', ({ releaseVersion }) => {
    const info = resolveReleaseInfo({
      ...native,
      updates: {
        isEmbeddedLaunch: false,
        manifest: { metadata: { releaseVersion, variant: {}, gitSha: true } },
      },
    })
    expect(info.runningSoftware).toBe('Unknown')
    expect(info.variant).toBe('Unknown')
    expect(info.gitSha).toBe('Unknown')
  })

  test('missing fields do not blank independent known identities', () => {
    const info = resolveReleaseInfo({
      ...native,
      appInfo: { version: null, build: '42' },
      updates: {
        runtimeVersion: 'attend-2',
        manifest: { metadata: { gitSha: compiled.gitSha, releaseVersion: 'invalid' } },
      },
    })
    expect(info.installedApp).toBe('Unknown (build 42)')
    expect(info.gitSha).toBe(compiled.gitSha)
    expect(info.runtimeVersion).toBe('attend-2')
    expect(info.updateId).toBe('Unknown')
  })

  test('installed marketing version is read literally rather than inferred from software semver', () => {
    const info = resolveReleaseInfo({ ...native, appInfo: { version: '1.2', build: null } })
    expect(info.installedApp).toBe('1.2 (build Unknown)')
    expect(info.runningSoftware).toBe('1.1.371')
  })

  test('semver prerelease/build versions and iOS build values are preserved', () => {
    const info = resolveReleaseInfo({
      ...native,
      compiled: { releaseVersion: '2.0.0-beta.1+sha.abc' },
      appInfo: { version: '1.1.371', build: '2.3.1' },
    })
    expect(info.runningSoftware).toBe('2.0.0-beta.1+sha.abc')
    expect(info.installedApp).toBe('1.1.371 (build 2.3.1)')
  })
})
