import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dirname, '../database/localMigrations')
const migrations: Record<string, string> = {}
for (const name of (await readdir(root)).sort()) {
  if (!/^\d{14}_/.test(name)) continue
  migrations[name] = await readFile(join(root, name, 'migration.sql'), 'utf8')
}
await writeFile(
  join(import.meta.dirname, '../database/localMigrations.generated.json'),
  `${JSON.stringify({ migrations }, null, 2)}\n`
)
