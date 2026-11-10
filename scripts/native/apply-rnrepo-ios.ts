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

export const REQUIRE_MARKER = '# [attend] rnrepo cocoapods plugin'
export const POST_INSTALL_MARKER = '# [attend] rnrepo_post_install'

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

/** Idempotently inject the RNRepo CocoaPods require + post_install hook. */
export function applyRnrepoToPodfile(podfile: string): { podfile: string; changed: boolean } {
  let next = podfile
  let changed = false

  if (!next.includes(REQUIRE_MARKER)) {
    next = `${REQUIRE_BLOCK}\n${next}`
    changed = true
  }

  if (!next.includes(POST_INSTALL_MARKER)) {
    const postInstall = /post_install\s+do\s+\|installer\|/
    const match = next.match(postInstall)
    if (!match || match.index === undefined) {
      throw new Error('[rnrepo] ios/Podfile has no post_install block to hook')
    }
    const insertAt = match.index + match[0].length
    next = `${next.slice(0, insertAt)}\n${POST_INSTALL_CALL}${next.slice(insertAt)}`
    changed = true
  }

  return { podfile: next, changed }
}

async function main() {
  if (!existsSync(podfilePath)) {
    console.log('[rnrepo] ios/Podfile missing; skip (run one prebuild first)')
    return
  }

  const current = readFileSync(podfilePath, 'utf8')
  const { podfile, changed } = applyRnrepoToPodfile(current)

  if (!changed) {
    console.log('[rnrepo] ios/Podfile already configured')
    return
  }

  writeFileSync(podfilePath, podfile)
  console.log('[rnrepo] applied CocoaPods plugin to ios/Podfile')

  if (process.platform === 'darwin') {
    await $`pod install`.cwd(iosDir)
  } else {
    console.log('[rnrepo] skipped pod install (not macOS); run it after prebuild on a Mac')
  }
}

if (import.meta.main) {
  await main()
}
