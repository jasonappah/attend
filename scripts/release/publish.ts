import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

// The caller must serialize ALL writers (including rollback) without cancellation.
// Prepared artifacts must come from the trusted release run, never a caller URL.
export interface Storage {
  get(key: string): Promise<Uint8Array | null>
  put(key: string, value: Uint8Array, contentType: string): Promise<void>
}

export interface Publication {
  directory: string
  version: string
  commit: string
  variant: string
  platform: string
  runtime: string
  predecessor: string // "none" for an empty feed; otherwise the exact previous manifest id
  nativeChange: boolean
  nativeVersion: string
  nativeBuild: number
  nativeReceipt?: unknown
}

type Asset = { hash: string; url: string; path: string }
type Manifest = {
  id: string
  createdAt: string
  runtimeVersion: string
  launchAsset: Asset
  assets: Asset[]
  metadata: Record<string, string | number | boolean>
}

const token = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const runtimeToken = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const hashPattern = /^[A-Za-z0-9_-]{43}$/
const digest = (value: Uint8Array) => createHash('sha256').update(value).digest('base64url')
const encode = (value: unknown) => Buffer.from(`${JSON.stringify(value)}\n`)
const decode = (value: Uint8Array) => JSON.parse(Buffer.from(value).toString('utf8'))
const equal = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b))

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export async function preparePublication(options: Publication) {
  const o = options
  assert(semver.test(o.version) && semver.test(o.nativeVersion), 'Invalid release version')
  assert(/^[a-f0-9]{40}$/.test(o.commit), 'Expected full commit SHA')
  assert(token.test(o.variant) && runtimeToken.test(o.runtime), 'Invalid variant/runtime')
  assert(o.platform === 'android' || o.platform === 'ios', 'Invalid platform')
  assert(Number.isSafeInteger(o.nativeBuild) && o.nativeBuild > 0, 'Invalid native build')
  assert(o.predecessor === 'none' || token.test(o.predecessor), 'Invalid predecessor')
  const bytes = await readFile(join(o.directory, 'manifest.json'))
  const m: Manifest = decode(bytes)
  assert(
    record(m) && typeof m.id === 'string' && token.test(m.id) && m.id !== 'none',
    'Invalid manifest id'
  )
  assert(
    typeof m.createdAt === 'string' && new Date(m.createdAt).toISOString() === m.createdAt,
    'Invalid manifest timestamp'
  )
  assert(m.runtimeVersion === o.runtime, 'Manifest runtime mismatch')
  assert(
    record(m.metadata) &&
      Object.values(m.metadata).every((v) => ['string', 'number', 'boolean'].includes(typeof v)),
    'Invalid metadata'
  )
  assert(
    m.metadata.releaseVersion === o.version &&
      m.metadata.gitSha === o.commit &&
      m.metadata.variant === o.variant,
    'Manifest release identity mismatch'
  )
  assert(Array.isArray(m.assets), 'Invalid assets')
  const paths = new Set<string>()
  const assets = new Map<string, Uint8Array>()
  for (const a of [m.launchAsset, ...m.assets]) {
    assert(
      record(a) && typeof a.hash === 'string' && hashPattern.test(a.hash),
      'Invalid asset hash'
    )
    assert(a.url === `assets/${a.hash}`, 'Asset URL must be content addressed and relative')
    assert(
      typeof a.path === 'string' &&
        a.path.length <= 512 &&
        a.path.split('/').every((p) => /^[A-Za-z0-9_.@-]+$/.test(p) && p !== '.' && p !== '..'),
      'Unsafe asset install path'
    )
    assert(!paths.has(a.path), 'Duplicate asset install path')
    paths.add(a.path)
    const file = join(o.directory, 'assets', a.hash)
    assert((await lstat(file)).isFile(), 'Asset must be a regular file')
    const body = await readFile(file)
    assert(digest(body) === a.hash, 'Asset checksum mismatch')
    assets.set(a.hash, body)
  }
  assert(m.launchAsset.path === 'main.jsbundle', 'Invalid launch asset path')
  const prefix = `updates/${o.variant}/${o.platform}/${o.runtime}`
  const archive = `releases/${o.version}/${o.commit}/${o.variant}/${o.platform}`
  const identity = {
    version: o.nativeVersion,
    build: o.nativeBuild,
    runtimeVersion: o.runtime,
    variant: o.variant,
    platform: o.platform,
  }
  const journal = encode({
    schemaVersion: 1,
    ...identity,
    releaseVersion: o.version,
    gitSha: o.commit,
    promotionId: m.id,
    predecessor: o.predecessor,
    manifestDigest: digest(bytes),
    assets: [...assets.keys()].sort(),
  })
  return { options: o, bytes, manifest: m, assets, prefix, archive, identity, journal }
}

// Immutable writes reject collisions rather than treating tag/archive existence as success.
async function immutable(
  storage: Storage,
  key: string,
  bytes: Uint8Array,
  type = 'application/json'
) {
  const existing = await storage.get(key)
  if (existing) assert(equal(existing, bytes), `Immutable artifact collision: ${key}`)
  else await storage.put(key, bytes, type)
}

export async function publish(options: Publication, storage: Storage) {
  const p = await preparePublication(options)
  const baselineKey = `native/${options.variant}/${options.platform}/${options.runtime}/complete.json`
  let receipt: Uint8Array
  if (options.nativeChange) {
    const r = options.nativeReceipt
    assert(
      record(r) && r.distributed === true && r.gitSha === options.commit,
      'Native distribution receipt required'
    )
    for (const [key, value] of Object.entries(p.identity))
      assert(r[key] === value, `Native receipt mismatch: ${key}`)
    receipt = encode(r)
  } else {
    const existing = await storage.get(baselineKey)
    assert(existing, 'Native baseline has not completed publication')
    const r = decode(existing)
    assert(
      record(r) && r.distributed === true && /^[a-f0-9]{40}$/.test(String(r.gitSha)),
      'Invalid native baseline receipt'
    )
    for (const [key, value] of Object.entries(p.identity))
      assert(r[key] === value, `Native baseline mismatch: ${key}`)
    receipt = existing
  }
  const existingBaseline = await storage.get(baselineKey)
  if (existingBaseline)
    assert(equal(existingBaseline, receipt), 'Native baseline receipt collision')
  const manifestKey = `${p.prefix}/manifest.json`
  // A retry after a partially failed run re-reads the artifact it already
  // activated, so the live manifest may legitimately be this exact publication
  // while the caller's predecessor is also its id.
  const checkCurrent = async () => {
    const bytes = await storage.get(manifestKey)
    if (bytes && equal(bytes, p.bytes)) return true
    const current = bytes ? decode(bytes) : null
    assert(
      current ? current.id === options.predecessor : options.predecessor === 'none',
      'Stale promotion: expected predecessor changed'
    )
    assert(p.manifest.id !== options.predecessor, 'Promotion must have a new identity')
    if (current)
      assert(
        Date.parse(p.manifest.createdAt) > Date.parse(current.createdAt),
        'Promotion timestamp must increase'
      )
    return false
  }
  await checkCurrent()
  await immutable(
    storage,
    `releases/${options.version}/identity.json`,
    encode({ gitSha: options.commit })
  )
  // The journal records the predecessor observed at activation. A retry after a
  // partial failure can observe its own already-live manifest instead, so the
  // recorded journal is authoritative for the same promotion and is never
  // rewritten or duplicated.
  const journalKey = `${p.archive}/publication.json`
  const recordedJournal = await storage.get(journalKey)
  let journal: Uint8Array = p.journal
  if (recordedJournal) {
    const value = decode(recordedJournal)
    assert(
      record(value) &&
        value.promotionId === p.manifest.id &&
        value.manifestDigest === digest(p.bytes) &&
        value.releaseVersion === options.version &&
        value.gitSha === options.commit &&
        value.predecessor !== undefined,
      `Immutable artifact collision: ${journalKey}`
    )
    journal = recordedJournal
  } else {
    await storage.put(journalKey, p.journal, 'application/json')
  }
  await immutable(storage, `${p.archive}/manifest.json`, p.bytes)
  for (const [hash, bytes] of p.assets) {
    await immutable(storage, `${p.archive}/assets/${hash}`, bytes, 'application/octet-stream')
    await immutable(storage, `${p.prefix}/assets/${hash}`, bytes, 'application/octet-stream')
  }
  // Re-read immediately before activation: serialization is still mandatory (no R2 CAS).
  if (!(await checkCurrent())) await storage.put(manifestKey, p.bytes, 'application/json')
  await immutable(storage, `${p.archive}/complete.json`, journal)
  // Dependent OTA releases must wait for the entire native publication, not allocation.
  await immutable(storage, baselineKey, receipt)
  return { promotionId: p.manifest.id, archive: p.archive }
}

export function wranglerStorage(bucket: string): Storage {
  assert(/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket), 'Invalid bucket')
  const run = (args: string[]) =>
    execFileSync('bunx', ['--no-install', 'wrangler', 'r2', 'object', ...args, '--remote'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  return {
    async get(key) {
      const dir = await mkdtemp(join(tmpdir(), 'attend-r2-read-'))
      try {
        const file = join(dir, 'object')
        try {
          run(['get', `${bucket}/${key}`, '--file', file])
        } catch (error) {
          const stderr = String((error as { stderr?: unknown }).stderr ?? '')
          if (/specified key does not exist|NoSuchKey|object does not exist/i.test(stderr))
            return null
          throw error
        }
        return await readFile(file)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    },
    async put(key, bytes, contentType) {
      const dir = await mkdtemp(join(tmpdir(), 'attend-r2-write-'))
      try {
        const file = join(dir, 'object')
        await writeFile(file, bytes)
        run(['put', `${bucket}/${key}`, '--file', file, '--content-type', contentType])
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    },
  }
}

if (import.meta.main) {
  const { values: v } = parseArgs({
    options: Object.fromEntries(
      [
        'directory',
        'bucket',
        'version',
        'commit',
        'variant',
        'platform',
        'runtime',
        'predecessor',
        'native-change',
        'native-version',
        'native-build',
        'native-receipt',
        'dry-run',
      ].map((name) => [name, { type: name === 'dry-run' ? 'boolean' : 'string' }])
    ),
  })
  const required = (name: string) => {
    const value = v[name]
    assert(typeof value === 'string' && value.length, `Missing --${name}`)
    return value
  }
  const nativeChange = required('native-change')
  assert(nativeChange === 'yes' || nativeChange === 'no', '--native-change must be yes/no')
  const options: Publication = {
    directory: required('directory'),
    version: required('version'),
    commit: required('commit'),
    variant: required('variant'),
    platform: required('platform'),
    runtime: required('runtime'),
    predecessor: required('predecessor'),
    nativeChange: nativeChange === 'yes',
    nativeVersion: required('native-version'),
    nativeBuild: Number(required('native-build')),
    nativeReceipt:
      typeof v['native-receipt'] === 'string'
        ? JSON.parse(await readFile(v['native-receipt'], 'utf8'))
        : undefined,
  }
  if (v['dry-run']) {
    const p = await preparePublication(options)
    console.info(
      JSON.stringify({
        validated: true,
        promotionId: p.manifest.id,
        archive: p.archive,
        note: 'Local validation only; predecessor and native receipt not checked remotely.',
      })
    )
  } else {
    assert(
      process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID,
      'Cloudflare production credentials required'
    )
    assert(
      process.env.APP_VARIANT === options.variant && process.env.NODE_ENV === 'production',
      'Explicit production environment required'
    )
    console.info(JSON.stringify(await publish(options, wranglerStorage(required('bucket')))))
  }
}
