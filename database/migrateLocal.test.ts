import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import migrations from './localMigrations.generated.json'
import { migrateLocal } from './migrateLocal'

function createDb() {
  const sqlite = new Database(':memory:')
  const executor = {
    async execute(sql: string, params: any[] = []) {
      const statement = sqlite.query(sql)
      return { rows: statement.all(...params) }
    },
  }
  return {
    sqlite,
    ...executor,
    async transaction(work: (tx: typeof executor) => Promise<void>) {
      sqlite.run('BEGIN')
      try {
        await work(executor)
        sqlite.run('COMMIT')
      } catch (error) {
        sqlite.run('ROLLBACK')
        throw error
      }
    },
  }
}

describe('native local migrations', () => {
  test('bundled migrations match every generated SQL file', async () => {
    const root = join(import.meta.dirname, 'localMigrations')
    const directories = (await readdir(root)).filter((name) => /^\d{14}_/.test(name)).sort()
    const drizzleMigrations = readMigrationFiles({ migrationsFolder: root })
    expect(migrations).toHaveLength(directories.length)
    for (const [index, name] of directories.entries()) {
      const sql = await readFile(join(root, name, 'migration.sql'), 'utf8')
      expect(migrations[index].hash).toBe(createHash('sha256').update(sql).digest('hex'))
      expect(migrations[index].createdAt).toBe(drizzleMigrations[index].folderMillis)
      expect(migrations[index].statements).toEqual(
        sql
          .split('--> statement-breakpoint')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    }
  })

  test('migrates once and preserves rows on subsequent opens', async () => {
    const db = createDb()
    await migrateLocal(db)
    db.sqlite.run("INSERT INTO backgroundTaskRun (id, task, ranAt) VALUES ('1', 'test', 42)")
    await migrateLocal(db)
    expect(db.sqlite.query('SELECT id FROM backgroundTaskRun').all()).toEqual([{ id: '1' }])
    expect(db.sqlite.query('SELECT hash FROM __drizzle_migrations').all()).toHaveLength(
      migrations.length
    )
  })

  test('recognizes an existing Drizzle migration', async () => {
    const db = createDb()
    db.sqlite.run(
      'CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
    )
    db.sqlite.run('CREATE TABLE backgroundTaskRun (id text)')
    db.sqlite.run('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
      migrations[0].hash,
      readMigrationFiles({ migrationsFolder: join(import.meta.dirname, 'localMigrations') })[0]
        .folderMillis,
    ])
    await migrateLocal(db)
    expect(db.sqlite.query('SELECT hash FROM __drizzle_migrations').all()).toHaveLength(1)
  })

  test('rolls back migrations when a statement fails', async () => {
    const db = createDb()
    db.sqlite.run('CREATE TABLE backgroundTaskRun (id text)')
    await expect(migrateLocal(db)).rejects.toThrow()
    expect(
      db.sqlite.query("SELECT name FROM sqlite_master WHERE name = '__drizzle_migrations'").all()
    ).toEqual([])
  })
})
