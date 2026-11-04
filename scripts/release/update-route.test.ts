import { expect, test } from 'bun:test'
import { serveUpdate } from '../../app/api/updates/[...rest]+api'

const request = (path: string) => new Request(`https://attend.test/api/updates/${path}`)

test('variant/platform/runtime isolation and manifest cache behavior', async () => {
  const keys: string[] = []
  const bucket = {
    async get(key: string) {
      keys.push(key)
      return {
        async arrayBuffer() {
          return new TextEncoder().encode('{}').buffer
        },
      }
    },
  }
  for (const variant of ['production', 'preview']) {
    const response = await serveUpdate(
      request(`${variant}/android/runtime-2/manifest.json`),
      bucket
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('cache-control')).toContain('must-revalidate')
  }
  expect(keys).toEqual([
    'updates/production/android/runtime-2/manifest.json',
    'updates/preview/android/runtime-2/manifest.json',
  ])
})

test('assets are immutable binary content', async () => {
  const response = await serveUpdate(request(`production/ios/r2/assets/${'a'.repeat(43)}`), {
    async get() {
      return {
        async arrayBuffer() {
          return new Uint8Array([1, 2]).buffer
        },
      }
    },
  })
  expect(response.headers.get('content-type')).toBe('application/octet-stream')
  expect(response.headers.get('cache-control')).toContain('immutable')
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2]))
})

test('malformed paths never reach storage, including legacy feeds and encoding tricks', async () => {
  for (const path of [
    'android/r2/manifest.json',
    'production/linux/r2/manifest.json',
    'production/android/r2/anything',
    'production/android/r2/assets/short',
    'production/android/r2/manifest.json/extra',
    'production/android/r2/%2e%2e%2fsecret',
    'prod%2fother/android/r2/manifest.json',
    'production/android/r2/assets/' + '+'.repeat(43),
    'production/android/r2//manifest.json',
  ]) {
    const response = await serveUpdate(request(path), {
      async get() {
        throw new Error('must not read')
      },
    })
    expect(response.status).toBe(400)
  }
})

test('missing bucket/object and storage failure fail safely', async () => {
  const r = request('production/android/r2/manifest.json')
  expect((await serveUpdate(r)).status).toBe(500)
  expect(
    (
      await serveUpdate(r, {
        async get() {
          return null
        },
      })
    ).status
  ).toBe(404)
  expect(
    (
      await serveUpdate(r, {
        async get() {
          throw new Error('down')
        },
      })
    ).status
  ).toBe(500)
})
