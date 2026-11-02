import { expect, test } from 'bun:test'
import { uuidv7 } from './uuid'

const V7_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test('returns an RFC 9562 version 7 id', () => {
  expect(uuidv7()).toMatch(V7_ID)
})

test('embeds the current millisecond timestamp', () => {
  const before = Date.now()
  // the first 12 hex digits record the 48-bit timestamp, before the version
  // nibble; drop the group separators before decoding.
  const timestamp = Number.parseInt(uuidv7().replaceAll('-', '').slice(0, 12), 16)
  const after = Date.now()
  expect(timestamp).toBeGreaterThanOrEqual(before)
  expect(timestamp).toBeLessThanOrEqual(after)
})

test('generates unique ids', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()))
  expect(ids.size).toBe(1000)
})
