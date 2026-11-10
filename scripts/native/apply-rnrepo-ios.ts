#!/usr/bin/env bun
/**
 * Inject RNRepo into the generated ios/Podfile after `one prebuild`.
 * ios/ is not committed; this keeps the CocoaPods hook without forking vxrn.
 * @see https://rnrepo.org
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { $ } from 'bun'

const root = join(import.meta.dirname, '../..')
const iosDir = join(root, 'ios')
const podfilePath = join(iosDir, 'Podfile')

const REQUIRE_MARKER = '# [attend] rnrepo cocoapods plugin'
const POST_INSTALL_MARKER = '# [attend] rnrepo_post_install'

const REQUIRE_BLOCK = `${REQUIRE_MARKER}
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
  "@rnrepo/build-tools/cocoapods-plugin/lib/plugin.rb",
  {paths: [process.argv[1]]},
)', __dir__]).strip
`

const POST_INSTALL_CALL = `    ${POST_INSTALL_MARKER}
    rnrepo_post_install(installer)
`

if (!existsSync(podfilePath)) {
  console.log('[rnrepo] ios/Podfile missing; skip (run one prebuild first)')
  process.exit(0)
}

let podfile = readFileSync(podfilePath, 'utf8')
let changed = false

if (!podfile.includes(REQUIRE_MARKER)) {
  podfile = `${REQUIRE_BLOCK}\n${podfile}`
  changed = true
}

if (!podfile.includes(POST_INSTALL_MARKER)) {
  const postInstall = /post_install\s+do\s+\|installer\|/
  const match = podfile.match(postInstall)
  if (!match || match.index === undefined) {
    throw new Error('[rnrepo] ios/Podfile has no post_install block to hook')
  }
  const insertAt = match.index + match[0].length
  podfile = `${podfile.slice(0, insertAt)}\n${POST_INSTALL_CALL}${podfile.slice(insertAt)}`
  changed = true
}

if (!changed) {
  console.log('[rnrepo] ios/Podfile already configured')
  process.exit(0)
}

writeFileSync(podfilePath, podfile)
console.log('[rnrepo] applied CocoaPods plugin to ios/Podfile')

if (process.platform === 'darwin') {
  await $`pod install`.cwd(iosDir)
} else {
  console.log('[rnrepo] skipped pod install (not macOS); run it after prebuild on a Mac')
}
