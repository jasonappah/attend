import { expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { BACKGROUND_TASKS } from './tasks'

it('declares every background task in Android manifest metadata', () => {
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  const metadata = manifest.match(
    /<meta-data\s+android:name="one\.backgroundTasks\.refresh"\s+android:value="([^"]*)"\s*\/>/
  )
  expect(metadata).not.toBeNull()
  expect(metadata?.[1].split(',').sort()).toEqual(Object.keys(BACKGROUND_TASKS).sort())
})
