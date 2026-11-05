import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { drizzle } from 'drizzle-orm/op-sqlite'
import { migrate } from 'drizzle-orm/op-sqlite/migrator'
import { drizzleMigrationClient } from './drizzleMigrationClient'
import migrations from './localMigrations.generated.json'

function createDb() {
  const sqlite = new Database(':memory:')
  const client = {
    async execute(sql: string, params: any[] = []) {
      sqlite.query(sql).run(...params)
      return { rows: [] }
    },
    async executeRaw(sql: string, params: any[] = []) {
      return { rawRows: sqlite.query(sql).values(...params) }
    },
  }
  return {
    sqlite,
    db: drizzle(drizzleMigrationClient(client) as unknown as Parameters<typeof drizzle>[0]),
  }
}

describe('native Drizzle migrations', () => {
  test('bundled migrations match every generated SQL file', async () => {
    const root = join(import.meta.dirname, 'localMigrations')
    const directories = (await readdir(root)).filter((name) => /^\d{14}_/.test(name)).sort()
    expect(Object.keys(migrations.migrations)).toEqual(directories)
    for (const name of directories) {
      expect(Reflect.get(migrations.migrations, name)).toBe(
        await readFile(join(root, name, 'migration.sql'), 'utf8')
      )
    }
  })

  test('migrates once and preserves rows on subsequent opens', async () => {
    const { sqlite, db } = createDb()
    await migrate(db, migrations)
    sqlite.run("INSERT INTO backgroundTaskRun (id, task, ranAt) VALUES ('1', 'test', 42)")
    await migrate(db, migrations)
    expect(sqlite.query('SELECT id FROM backgroundTaskRun').all()).toEqual([{ id: '1' }])
    expect(sqlite.query('SELECT hash FROM __drizzle_migrations').all()).toHaveLength(1)
  })

  test('recognizes the timestamp of an existing Drizzle migration', async () => {
    const { sqlite, db } = createDb()
    sqlite.run(
      'CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
    )
    sqlite.run('CREATE TABLE backgroundTaskRun (id text)')
    const previous = readMigrationFiles({
      migrationsFolder: join(import.meta.dirname, 'localMigrations'),
    })[0]
    sqlite.run('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
      previous.hash,
      previous.folderMillis,
    ])
    await migrate(db, migrations)
    expect(sqlite.query('SELECT hash FROM __drizzle_migrations').all()).toHaveLength(1)
  })

  test('rolls back a partially executed migration when a later statement fails', async () => {
    const { sqlite, db } = createDb()
    await expect(
      migrate(db, {
        migrations: {
          '20261105000000_failure':
            'CREATE TABLE test (id integer);--> statement-breakpoint INSERT INTO missing VALUES (1);',
        },
      })
    ).rejects.toThrow()
    expect(sqlite.query("SELECT name FROM sqlite_master WHERE name = 'test'").all()).toEqual([])
    expect(sqlite.query('SELECT * FROM __drizzle_migrations').all()).toEqual([])
  })
})
