import { execFileSync } from 'node:child_process'
// prepare the One build with published Orez deployment primitives.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve, join } from 'node:path'
import {
  defineCloudflareConfig,
  buildMigrationModuleSource,
  readNativeSqlMigrationStatements,
  bundleCloudflareLiteAppWorker,
  configureCloudflareWorker,
  importSpecifier,
  pruneUnreachableWorkerModules,
  stripDeadPageRouteImports,
  assertWorkerStaticModuleImportsResolve,
} from 'orez-lite/cloudflare/build'
import { schema } from '../data/generated/schema'
import {
  cloudflareRustSyncHostSource,
  cloudflareRustSyncWranglerConfig,
  rustSyncAppSchema,
} from './cloudflare/sync-source'

const origin = process.env.ONE_SERVER_URL
if (!origin || !origin.startsWith('https://'))
  throw new Error('ONE_SERVER_URL must name the HTTPS deployment origin')
const workerName = process.env.ATTEND_CF_WORKER_NAME
const bucketName = process.env.ATTEND_CF_BUCKET_NAME
const publicFilesUrl = process.env.ATTEND_CF_FILES_URL
if (!workerName || !bucketName || !publicFilesUrl)
  throw new Error('Set ATTEND_CF_WORKER_NAME, ATTEND_CF_BUCKET_NAME, and ATTEND_CF_FILES_URL before deploying.')
const root = resolve('.')
const workerDir = join(root, 'dist/worker')
const syncDir = join(root, 'dist/orez-sync')
const cfg = defineCloudflareConfig('soot', {
  compiledWasmModules: ['orez-sync-cf-host/wasm-module.wasm'],
})
const statements = readNativeSqlMigrationStatements(
  join(root, 'database/migrations'),
  (sql) => ({
    sql,
  }),
)
const version = createHash('sha256')
  .update(JSON.stringify([statements, schema]))
  .digest('hex')
  .slice(0, 16)
const config = JSON.parse(readFileSync(join(workerDir, 'wrangler.json'), 'utf8'))
configureCloudflareWorker(config)
config.name = workerName
delete config.account_id
config.workers_dev = true
delete config.routes
config.migrations = [{ tag: 'v1', new_sqlite_classes: ['ZeroSqlDO'] }]
config.services = [{ binding: 'SYNC', service: `${workerName}-sync` }]
config.r2_buckets = [{ binding: 'FILES', bucket_name: bucketName }]
config.vars = {
  NODE_ENV: 'production',
  ALLOW_MISSING_ENV: '1',
  BETTER_AUTH_URL: origin,
  VITE_PROTOCOL: 'https',
  VITE_WEB_HOSTNAME: new URL(origin).hostname,
  VITE_ZERO_HOSTNAME: new URL(origin).hostname,
  ZERO_APP_ID: 'attend',
  CLOUDFLARE_R2_BUCKET: bucketName,
  CLOUDFLARE_R2_PUBLIC_URL: publicFilesUrl,
}
writeFileSync(join(workerDir, 'wrangler.json'), JSON.stringify(config, null, 2))
await bundleCloudflareLiteAppWorker(cfg, {
  workerDir,
  entryPoint: join(root, 'scripts/cloudflare/app-worker.js'),
  outfile: join(workerDir, 'index.js.patched'),
  writeMigrationModule: async () => {
    const path = join(workerDir, 'orez-migrations.js')
    writeFileSync(
      join(workerDir, 'orez-schema-version.js'),
      `export const SCHEMA_VERSION = ${JSON.stringify(version)}\n`,
    )
    writeFileSync(
      path,
      buildMigrationModuleSource(cfg, {
        mode: 'native',
        schemaVersion: version,
        schemaImportSpecifier: importSpecifier(
          workerDir,
          join(root, 'data/generated/schema.ts'),
        ),
        nativeSqlStatements: statements,
      }),
    )
    return path
  },
})
renameSync(join(workerDir, 'index.js.patched'), join(workerDir, 'index.js'))
if (stripDeadPageRouteImports(workerDir))
  pruneUnreachableWorkerModules(workerDir, 'index.js')
assertWorkerStaticModuleImportsResolve(workerDir)
mkdirSync(syncDir, { recursive: true })
const sourceVersion = JSON.parse(
  readFileSync(join(root, 'dist/client/version.json'), 'utf8'),
).version
const queryVersion = [...sourceVersion].reduce(
  (hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0,
  0,
)
writeFileSync(
  join(syncDir, 'orez-sync-host.js'),
  cloudflareRustSyncHostSource(
    rustSyncAppSchema(schema).schema,
    'attend',
    origin,
    [],
    queryVersion,
    importSpecifier(syncDir, join(root, 'data/generated/syncedQueries.ts')),
    importSpecifier(syncDir, join(root, 'data/generated/schema.ts')),
  ),
)
const syncConfig = cloudflareRustSyncWranglerConfig({
  appWorkerName: workerName,
  appOrigin: origin,
  authRequired: true,
})
writeFileSync(join(syncDir, 'wrangler.json'), JSON.stringify(syncConfig, null, 2))
execFileSync('bun', ['scripts/check-cloudflare.ts'], { stdio: 'inherit' })
if (!process.argv.includes('--prepare-only')) {
  for (const directory of [syncDir, workerDir])
    execFileSync(
      'bunx',
      ['wrangler', 'deploy', '--config', join(directory, 'wrangler.json')],
      {
        stdio: 'inherit',
      },
    )
}
