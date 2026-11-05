// Drizzle's pinned OP SQLite driver targets older async method names and a
// bare array result; One exposes the current OP SQLite API instead.
export function drizzleMigrationClient(database: {
  execute: (...args: any[]) => Promise<unknown>
  executeRaw: (...args: any[]) => Promise<{ rawRows: unknown[][] }>
}) {
  return {
    executeAsync: database.execute.bind(database),
    executeRawAsync: async (...args: any[]) => (await database.executeRaw(...args)).rawRows,
  }
}
