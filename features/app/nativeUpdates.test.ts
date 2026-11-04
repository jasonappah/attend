import { describe, expect, test } from 'bun:test'
import { createNativeUpdateCoordinator } from './nativeUpdates'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('background native updates', () => {
  test('debug and disabled builds do not fetch', async () => {
    let calls = 0
    const fetch = async () => {
      calls++
    }
    createNativeUpdateCoordinator({ isEnabled: true, fetch }, true)()
    createNativeUpdateCoordinator({ isEnabled: false, fetch }, false)()
    await flush()
    expect(calls).toBe(0)
  })

  test('mount returns before fetching; repeated starts cannot fetch concurrently or again', async () => {
    let calls = 0
    let finish!: () => void
    const start = createNativeUpdateCoordinator(
      {
        isEnabled: true,
        fetch: () => {
          calls++
          return new Promise<void>((resolve) => {
            finish = resolve
          })
        },
      },
      false
    )
    expect(start()).toBeUndefined()
    expect(calls).toBe(0)
    start()
    await flush()
    expect(calls).toBe(1)
    start()
    finish()
    await flush()
    start()
    await flush()
    expect(calls).toBe(1)
  })

  test.each(['none', 'fetched'])('%s never reloads or changes running identity', async (type) => {
    const running = { id: 'currently-running' }
    let reloads = 0
    const updates = {
      isEnabled: true,
      manifest: running,
      reload: () => {
        reloads++
      },
      fetch: async () => ({ type, manifest: { id: 'staged-for-next-launch' } }),
    }
    createNativeUpdateCoordinator(updates, false)()
    await flush()
    expect(updates.manifest).toBe(running)
    expect(reloads).toBe(0)
  })

  test('network and synchronous bridge errors are nonfatal and not retried', async () => {
    for (const fetch of [
      () => Promise.reject(new Error('network')),
      () => {
        throw new Error('bridge')
      },
    ]) {
      let errors = 0
      const start = createNativeUpdateCoordinator({ isEnabled: true, fetch }, false, () => {
        errors++
        throw new Error('logger')
      })
      start()
      await flush()
      start()
      expect(errors).toBe(1)
    }
  })
})
