import { execFileSync } from 'bun:child_process'
import { readFileSync } from 'bun:fs'
import { nativeReleaseConfig } from '../../config/release'

export { nativeReleaseConfig }

export function validateAndroidIntegration(sources: {
  application: string
  manifest: string
  gradle: string
}) {
  const required = {
    application: [
      'com.margelo.nitro.one.OneUpdatesReactHost.getDefaultReactHost',
      'getDefaultReactHost(',
    ],
    manifest: [
      'dev.onejs.updates.url',
      'dev.onejs.updates.runtimeVersion',
      '@string/one_updates_runtime_version',
    ],
    gradle: [
      'one-updates-embedded.json',
      'bundleTask.jsBundleDir',
      'runtimeVersion: embeddedRuntime',
      'versionCode releaseConfig.build',
      'versionName releaseConfig.version',
    ],
  }
  for (const [source, markers] of Object.entries(required)) {
    for (const marker of markers) {
      if (!sources[source as keyof typeof sources].includes(marker)) {
        throw new Error(`Missing Android update integration in ${source}: ${marker}`)
      }
    }
  }
}

// Gradle reads the same validated configuration as Vite. No native regeneration.
if (import.meta.main) {
  const state = JSON.parse(readFileSync(new URL('../../release.json', import.meta.url), 'utf8'))
  const read = (path: string) =>
    readFileSync(new URL(`../../android/app/${path}`, import.meta.url), 'utf8')
  validateAndroidIntegration({
    application: read('src/main/java/me/jasonaa/attend/MainApplication.kt'),
    manifest: read('src/main/AndroidManifest.xml'),
    gradle: read('build.gradle'),
  })
  const software = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  const gitSha =
    process.env.ONE_PUBLIC_GIT_SHA ||
    execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: new URL('../..', import.meta.url),
      encoding: 'utf8',
    }).trim()
  console.log(
    JSON.stringify({
      ...nativeReleaseConfig(state, process.env),
      softwareVersion: software.version,
      gitSha,
    })
  )
}
