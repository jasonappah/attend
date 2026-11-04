import { createHash } from 'bun:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'bun:fs'
import { tmpdir } from 'bun:os'
import { join } from 'bun:path'
import { describe, expect, test } from 'bun:test'
import { type Publication, preparePublication, publish, type Storage } from './publish'

class FakeStorage implements Storage {
  objects = new Map<string, Uint8Array>()
  writes: string[] = []
  fail = ''
  async get(key: string) {
    return this.objects.get(key) ?? null
  }
  async put(key: string, value: Uint8Array) {
    if (key === this.fail) throw new Error('upload failed')
    this.writes.push(key)
    this.objects.set(key, value)
  }
}

const json = (value: unknown) => Buffer.from(JSON.stringify(value))
const feed = 'updates/production/android/runtime-2'
const baseline = 'native/production/android/runtime-2/complete.json'

async function fixture(run: (o: Publication, storage: FakeStorage) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), 'attend-publication-test-'))
  try {
    const body = Buffer.from('hermes bytecode fixture')
    const hash = createHash('sha256').update(body).digest('base64url')
    mkdirSync(join(directory, 'assets'))
    writeFileSync(join(directory, 'assets', hash), body)
    const o: Publication = {
      directory,
      version: '1.1.372',
      commit: 'a'.repeat(40),
      variant: 'production',
      platform: 'android',
      runtime: 'runtime-2',
      predecessor: 'none',
      nativeChange: true,
      nativeVersion: '1.1.372',
      nativeBuild: 2,
    }
    o.nativeReceipt = {
      version: o.nativeVersion,
      build: o.nativeBuild,
      runtimeVersion: o.runtime,
      variant: o.variant,
      platform: o.platform,
      gitSha: o.commit,
      distributed: true,
    }
    writeFileSync(
      join(directory, 'manifest.json'),
      json({
        id: 'promotion-1',
        createdAt: '2026-11-04T12:00:00.000Z',
        runtimeVersion: o.runtime,
        launchAsset: { hash, url: `assets/${hash}`, path: 'main.jsbundle' },
        assets: [],
        metadata: { releaseVersion: o.version, gitSha: o.commit, variant: o.variant },
      })
    )
    await run(o, new FakeStorage())
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('safe publication', () => {
  test('uploads verified assets before manifest and completes; retry reuses exact artifacts', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      const result = await publish(o, s)
      expect(result.promotionId).toBe('promotion-1')
      const manifestIndex = s.writes.indexOf(`${feed}/manifest.json`)
      expect(s.writes.indexOf(`${feed}/assets/${p.manifest.launchAsset.hash}`)).toBeLessThan(
        manifestIndex
      )
      expect(s.writes.at(-1)).toBe(baseline)
      s.writes = []
      await publish(o, s)
      expect(s.writes).toEqual([])
    }))

  test('asset failure never activates and resumes with original manifest', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      s.fail = `${feed}/assets/${p.manifest.launchAsset.hash}`
      await expect(publish(o, s)).rejects.toThrow('upload failed')
      expect(s.objects.has(`${feed}/manifest.json`)).toBe(false)
      s.fail = ''
      await publish(o, s)
      expect(s.objects.has(`${p.archive}/complete.json`)).toBe(true)
    }))

  test('manifest uploaded but completion failed resumes without promoting again', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      s.fail = `${p.archive}/complete.json`
      await expect(publish(o, s)).rejects.toThrow()
      expect(s.objects.has(`${feed}/manifest.json`)).toBe(true)
      s.fail = ''
      s.writes = []
      await publish(o, s)
      expect(s.writes).toEqual([`${p.archive}/complete.json`, baseline])
    }))

  test('conflicting immutable artifact fails closed', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      s.objects.set(`${p.archive}/manifest.json`, json({ id: 'different' }))
      await expect(publish(o, s)).rejects.toThrow('collision')
      expect(s.objects.has(`${feed}/manifest.json`)).toBe(false)
    }))

  test('retry after activation accepts the live manifest as its own predecessor', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      s.fail = baseline
      await expect(publish(o, s)).rejects.toThrow('upload failed')
      expect(s.objects.has(`${feed}/manifest.json`)).toBe(true)
      s.fail = ''
      s.writes = []
      o.predecessor = p.manifest.id
      await publish(o, s)
      expect(s.writes).toEqual([baseline])
    }))

  test('stale retry cannot overwrite newer publication or rollback, even with older timestamp', () =>
    fixture(async (o, s) => {
      await publish(o, s)
      s.objects.set(
        `${feed}/manifest.json`,
        json({ id: 'explicit-rollback', createdAt: '2025-01-01T00:00:00.000Z' })
      )
      s.writes = []
      await expect(publish(o, s)).rejects.toThrow('Stale promotion')
      expect(s.writes).toEqual([])
    }))

  test('exact predecessor and increasing timestamp are required', () =>
    fixture(async (o, s) => {
      s.objects.set(
        `${feed}/manifest.json`,
        json({ id: 'previous', createdAt: '2026-11-04T13:00:00.000Z' })
      )
      o.predecessor = 'previous'
      await expect(publish(o, s)).rejects.toThrow('timestamp')
      expect(s.writes).toEqual([])
      s.objects.set(
        `${feed}/manifest.json`,
        json({ id: 'previous', createdAt: '2026-11-04T11:00:00.000Z' })
      )
      await publish(o, s)
    }))

  test('OTA-only waits for native baseline and validates every identity field', () =>
    fixture(async (o, s) => {
      o.nativeChange = false
      await expect(publish(o, s)).rejects.toThrow('Native baseline')
      expect(s.writes).toEqual([])
      s.objects.set(baseline, json({ ...(o.nativeReceipt as object), build: 99 }))
      await expect(publish(o, s)).rejects.toThrow('build')
      s.objects.set(baseline, json(o.nativeReceipt))
      await publish(o, s)
    }))

  test('native publication requires distribution evidence and checks collision before promotion', () =>
    fixture(async (o, s) => {
      const receipt = o.nativeReceipt
      o.nativeReceipt = undefined
      await expect(publish(o, s)).rejects.toThrow('receipt required')
      o.nativeReceipt = receipt
      s.objects.set(baseline, json({ unrelated: true }))
      await expect(publish(o, s)).rejects.toThrow('collision')
      expect(s.writes).toEqual([])
    }))

  test('checksum mismatch fails before any remote mutation', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      writeFileSync(join(o.directory, 'assets', p.manifest.launchAsset.hash), 'tampered')
      await expect(publish(o, s)).rejects.toThrow('checksum')
      expect(s.writes).toEqual([])
    }))

  test('unsafe URLs, install paths, metadata, and runtime fail validation', () =>
    fixture(async (o, s) => {
      const p = await preparePublication(o)
      for (const bad of [
        { ...p.manifest, runtimeVersion: 'other' },
        { ...p.manifest, metadata: { ...p.manifest.metadata, gitSha: 'wrong' } },
        { ...p.manifest, launchAsset: { ...p.manifest.launchAsset, url: 'https://evil.test/x' } },
        { ...p.manifest, launchAsset: { ...p.manifest.launchAsset, path: '../evil' } },
        { ...p.manifest, assets: [p.manifest.launchAsset] },
      ]) {
        writeFileSync(join(o.directory, 'manifest.json'), json(bad))
        await expect(publish(o, s)).rejects.toThrow()
      }
      expect(s.writes).toEqual([])
    }))

  test('a read/auth failure is not interpreted as an empty feed', () =>
    fixture(async (o, s) => {
      s.get = async () => {
        throw new Error('permission denied')
      }
      await expect(publish(o, s)).rejects.toThrow('permission denied')
      expect(s.writes).toEqual([])
    }))

  test('same software version cannot bind to another commit', () =>
    fixture(async (o, s) => {
      s.objects.set(`releases/${o.version}/identity.json`, json({ gitSha: 'b'.repeat(40) }))
      await expect(publish(o, s)).rejects.toThrow('collision')
      expect(s.writes).toEqual([])
    }))

  test('feed change during asset upload is detected before activation', () =>
    fixture(async (o, s) => {
      const original = s.put.bind(s)
      s.put = async (key, bytes) => {
        await original(key, bytes)
        if (key.startsWith(`${feed}/assets/`))
          s.objects.set(`${feed}/manifest.json`, json({ id: 'other-promotion' }))
      }
      await expect(publish(o, s)).rejects.toThrow('Stale promotion')
      expect(s.writes).not.toContain(`${feed}/manifest.json`)
      expect(s.objects.has(baseline)).toBe(false)
    }))

  test('CLI dry-run stays offline and live mode rejects missing production environment', () =>
    fixture(async (o) => {
      const args = [
        'bun',
        'scripts/release/publish.ts',
        '--directory',
        o.directory,
        '--bucket',
        'test-bucket',
        '--version',
        o.version,
        '--commit',
        o.commit,
        '--variant',
        o.variant,
        '--platform',
        o.platform,
        '--runtime',
        o.runtime,
        '--predecessor',
        'none',
        '--native-change',
        'yes',
        '--native-version',
        o.nativeVersion,
        '--native-build',
        String(o.nativeBuild),
      ]
      const env = {
        PATH: process.env.PATH,
        NODE_ENV: 'development',
        CLOUDFLARE_API_TOKEN: 'unused-test-value',
        CLOUDFLARE_ACCOUNT_ID: 'unused-test-value',
      }
      const dry = Bun.spawn([...args, '--dry-run'], { env, stdout: 'pipe', stderr: 'pipe' })
      expect(await dry.exited).toBe(0)
      expect(JSON.parse(await new Response(dry.stdout).text()).validated).toBe(true)
      const live = Bun.spawn(args, { env, stdout: 'pipe', stderr: 'pipe' })
      expect(await live.exited).not.toBe(0)
      expect(await new Response(live.stderr).text()).toContain(
        'Explicit production environment required'
      )
    }))
})
