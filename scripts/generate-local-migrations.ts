import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dirname, '../database/localMigrations')
const migrations = []
for (const name of (await readdir(root)).sort()) {
  if (!/^\d{14}_/.test(name)) continue
  const sql = await readFile(join(root, name, 'migration.sql'), 'utf8')
  const date = name.slice(0, 14)
  migrations.push({
    createdAt: Date.UTC(
      +date.slice(0, 4),
      +date.slice(4, 6) - 1,
      +date.slice(6, 8),
      +date.slice(8, 10),
      +date.slice(10, 12),
      +date.slice(12, 14)
    ),
    hash: createHash('sha256').update(sql).digest('hex'),
    statements: sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean),
  })
}
await writeFile(
  join(import.meta.dirname, '../database/localMigrations.generated.json'),
  `${JSON.stringify(migrations, null, 2)}\n`
)
