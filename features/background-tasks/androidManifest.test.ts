import { expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { BACKGROUND_TASKS } from './tasks'

it('declares every background task in Android manifest metadata', () => {
  const xml = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  expect(XMLValidator.validate(xml)).toBe(true)

  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === 'meta-data',
  })
  const manifest = parser.parse(xml) as {
    manifest: {
      application: {
        'meta-data': { '@_android:name': string; '@_android:value'?: string }[]
      }
    }
  }
  const metadata = manifest.manifest.application['meta-data'].filter(
    (entry) => entry['@_android:name'] === 'one.backgroundTasks.refresh'
  )
  expect(metadata).toHaveLength(1)
  expect(metadata[0]?.['@_android:value']?.split(',').sort()).toEqual(
    Object.keys(BACKGROUND_TASKS).sort()
  )
})
