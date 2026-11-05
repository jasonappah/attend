import migrations from './localMigrations.generated.json'

type Executor = {
  execute: (sql: string, params?: any[]) => Promise<{ rows?: any[] }>
}

type Database = Executor & {
  transaction: (work: (tx: Executor) => Promise<void>) => Promise<void>
}

// Match Drizzle's migration table and timestamps, but use bundled SQL rather
// than its Node-only filesystem migrator on Hermes.
export async function migrateLocal(db: Database) {
  await db.transaction(async (tx) => {
    await tx.execute(
      'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
    )
    const result = await tx.execute(
      'SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1'
    )
    const last = Number(result.rows?.[0]?.created_at ?? 0)
    for (const migration of migrations) {
      if (migration.createdAt <= last) continue
      for (const statement of migration.statements) await tx.execute(statement)
      await tx.execute('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
        migration.hash,
        migration.createdAt,
      ])
    }
  })
}
