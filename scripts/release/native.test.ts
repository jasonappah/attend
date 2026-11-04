import { readFileSync } from 'bun:fs'
import { describe, expect, test } from 'bun:test'
import { nativeReleaseConfig, validateAndroidIntegration } from './native'

const state = { native: { version: '1.1.371', build: 2, runtimeVersion: '1.0.1' } }
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('native release configuration', () => {
  test.each(['development', 'preview', 'production'])(
    '%s isolates the application and update feed',
    (variant) => {
      const config = nativeReleaseConfig(state, {
        APP_VARIANT: variant,
        VITE_WEB_HOSTNAME: 'attend.example',
      })
      expect(config.bundleId).toBe(
        `me.jasonaa.attend${variant === 'production' ? '' : variant === 'development' ? '.dev' : '.preview'}`
      )
      expect(config.updatesUrl).toEndWith(`/api/updates/${variant}`)
      expect(config.displayName).toBe(
        variant === 'production'
          ? 'Attend'
          : variant === 'preview'
            ? 'Attend (Preview)'
            : 'Attend (Dev)'
      )
      expect(config.version).toBe('1.1.371')
      expect(config.build).toBe(2)
      expect(config.runtimeVersion).toBe('1.0.1')
    }
  )

  test('software version does not change the installed binary identity', () => {
    expect(nativeReleaseConfig({ ...state, version: '2.0.0' }).version).toBe('1.1.371')
  })

  test('explicit origins retain variant isolation', () => {
    expect(
      nativeReleaseConfig(state, {
        APP_VARIANT: 'production',
        UPDATES_URL: 'https://attend.example/api/updates/production',
      }).updatesUrl
    ).toBe('https://attend.example/api/updates/production')
    for (const UPDATES_URL of [
      'https://example.com/api/updates',
      'https://example.com/api/updates/preview',
      'https://example.com/api/updates/production?x=1',
    ]) {
      expect(() => nativeReleaseConfig(state, { APP_VARIANT: 'production', UPDATES_URL })).toThrow(
        'UPDATES_URL'
      )
    }
  })

  test('invalid state and variants fail before building', () => {
    for (const invalid of [
      {},
      { native: {} },
      { native: { ...state.native, build: 0 } },
      { native: { ...state.native, runtimeVersion: '../escape' } },
    ]) {
      expect(() => nativeReleaseConfig(invalid)).toThrow('native release')
    }
    for (const APP_VARIANT of ['other', 'constructor', '__proto__']) {
      expect(() => nativeReleaseConfig(state, { APP_VARIANT })).toThrow('APP_VARIANT')
    }
  })

  test('production cannot silently ship a local or plaintext feed', () => {
    expect(() => nativeReleaseConfig(state, { APP_VARIANT: 'production' })).toThrow(
      'production origin'
    )
    expect(() =>
      nativeReleaseConfig(state, {
        APP_VARIANT: 'production',
        UPDATES_URL: 'http://attend.example/api/updates/production',
      })
    ).toThrow('production origin')
  })

  test('maintained project integrates installed One launcher contract and keeps signing', () => {
    const gradle = read('android/app/build.gradle')
    const manifest = read('android/app/src/main/AndroidManifest.xml')
    expect(read('android/app/src/main/java/me/jasonaa/attend/MainApplication.kt')).toContain(
      'com.margelo.nitro.one.OneUpdatesReactHost.getDefaultReactHost'
    )
    expect(manifest).toContain('dev.onejs.updates.url')
    expect(manifest).toContain('dev.onejs.updates.runtimeVersion')
    expect(manifest).toContain('@string/one_updates_runtime_version')
    expect(gradle).toContain('scripts/release/native.ts')
    expect(gradle).toContain('versionCode releaseConfig.build')
    expect(gradle).toContain('versionName releaseConfig.version')
    expect(gradle).toContain('resValue "string", "app_name", releaseConfig.displayName')
    expect(gradle).toContain('one-updates-embedded.json')
    expect(gradle).toContain('bundleTask.jsBundleDir')
    expect(gradle).toContain('runtimeVersion: embeddedRuntime')
    expect(gradle).toContain('signingConfig signingConfigs.release')
    expect(gradle).toContain('ANDROID_RELEASE_STORE_FILE')
    const script = read('scripts/release-android.sh')
    expect(script).toContain('export APP_VARIANT=production')
    expect(script).toContain('armeabi-v7a')
    expect(script).not.toContain('prebuild')
    const vite = read('vite.config.ts')
    expect(vite).toContain('version: appIdentity.version')
    expect(vite).toContain('buildNumber: String(appIdentity.build)')
    expect(vite).toContain('runtimeVersion: appIdentity.runtimeVersion')
    expect(vite).toContain('process.env.ONE_PUBLIC_RELEASE_VERSION = packageInfo.version')
    expect(read('android/gradle.properties')).toContain('reactNativeArchitectures=armeabi-v7a')
    const fixture = {
      application: read('android/app/src/main/java/me/jasonaa/attend/MainApplication.kt'),
      gradle,
      manifest,
    }
    expect(() => validateAndroidIntegration(fixture)).not.toThrow()
    for (const source of ['application', 'gradle', 'manifest'] as const) {
      expect(() => validateAndroidIntegration({ ...fixture, [source]: '' })).toThrow(
        'Missing Android update integration'
      )
    }
  })
})
