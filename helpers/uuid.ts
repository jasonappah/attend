// UUID v7 (RFC 9562) is time-ordered: the first 48 bits are a unix
// millisecond timestamp and the rest is random, so new rows sort by creation
// time instead of scattering across a btree the way a v4 id does.
const HEX_BYTES = Array.from({ length: 256 }, (_, byte) => byte.toString(16).padStart(2, '0'))

export function uuidv7(): string {
  // one's crypto polyfill provides getRandomValues on native and the browser
  // provides it on web, so this is the same source uuid.randomUUID() draws from.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const timestamp = Date.now()

  // timestamp: 48 bits, big-endian, milliseconds since the epoch.
  bytes[0] = Math.floor(timestamp / 2 ** 40) % 256
  bytes[1] = Math.floor(timestamp / 2 ** 32) % 256
  bytes[2] = Math.floor(timestamp / 2 ** 24) % 256
  bytes[3] = Math.floor(timestamp / 2 ** 16) % 256
  bytes[4] = Math.floor(timestamp / 2 ** 8) % 256
  bytes[5] = timestamp % 256

  // version 7, then the RFC 4122 variant (10xxxxxx).
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  let id = ''
  for (let index = 0; index < bytes.length; index += 1) {
    id += HEX_BYTES[bytes[index]]
    if (index === 3 || index === 5 || index === 7 || index === 9) id += '-'
  }
  return id
}
