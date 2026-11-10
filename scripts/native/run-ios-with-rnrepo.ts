#!/usr/bin/env bun
/**
 * Ensure ios/ exists (via one prebuild), inject RNRepo into the Podfile, then run iOS.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { $ } from 'bun'

const root = join(import.meta.dirname, '../..')

if (!existsSync(join(root, 'ios'))) {
  await $`bunx one prebuild`.cwd(root)
}

await $`bun scripts/native/apply-rnrepo-ios.ts`.cwd(root)

const passthrough = Bun.argv.slice(2)
const proc = Bun.spawn(['bunx', 'one', 'run:ios', ...passthrough], {
  cwd: root,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
})
process.exit(await proc.exited)
