/**
 * Local client for production Application SQL via the temporary ops worker.
 *
 * Terminal 1:  bun run prod-do
 * Terminal 2:  bun run prod-sql -- 'SELECT id FROM course LIMIT 5'
 *              bun run prod-sql -- 'SELECT * FROM course WHERE id = ?' -- '<id>'
 *              bun run prod-sql            # interactive REPL
 *
 * Requires `wrangler login` and `bun run prod-do` (`wrangler dev --remote`).
 * Writes go through ZeroSqlDO /exec so CDC still feeds Lime Sync.
 */
import { createInterface } from 'node:readline/promises'

const origin = (process.env.PROD_DO_URL ?? 'http://127.0.0.1:8791').replace(/\/$/, '')
const token = process.env.PROD_DO_OPS_TOKEN

type ExecResult = {
  rows?: Record<string, unknown>[]
  columns?: string[]
  changes?: number
  capturedChanges?: number
  error?: string
}

function usage(): never {
  console.error(`Usage:
  bun run prod-sql -- '<sql>' [-- <param>...]
  bun run prod-sql                 # REPL

Env:
  PROD_DO_URL          default http://127.0.0.1:8791
  PROD_DO_OPS_TOKEN    optional; must match ops worker .dev.vars if set`)
  process.exit(1)
}

function parseArgs(argv: string[]): { sql: string; params: unknown[] } | 'repl' {
  const args = argv.slice(2)
  if (args.length === 0) return 'repl'
  if (args[0] === '-h' || args[0] === '--help') usage()

  const dash = args.indexOf('--')
  if (dash === 0) usage()
  if (dash === -1) return { sql: args[0]!, params: args.slice(1).map(coerceParam) }
  const sql = args.slice(0, dash).join(' ').trim()
  if (!sql) usage()
  return { sql, params: args.slice(dash + 1).map(coerceParam) }
}

function coerceParam(value: string): unknown {
  if (value === 'null') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d+\.\d+$/.test(value)) return Number(value)
  return value
}

async function execSql(sql: string, params: unknown[] = []): Promise<ExecResult> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers['x-prod-do-token'] = token
  let response: Response
  try {
    response = await fetch(`${origin}/exec`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql, params }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `ops worker unreachable at ${origin} (${message}). Start it with: bun run prod-do`
    )
  }
  const body = (await response.json()) as ExecResult
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  if (body.error) throw new Error(body.error)
  return body
}

function printResult(result: ExecResult) {
  const rows = result.rows ?? []
  const columns =
    result.columns && result.columns.length > 0
      ? result.columns
      : rows[0]
        ? Object.keys(rows[0])
        : []

  if (columns.length && rows.length) {
    console.table(rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c]]))))
  } else if (rows.length) {
    console.log(JSON.stringify(rows, null, 2))
  } else {
    console.log('(no rows)')
  }

  const parts: string[] = []
  if (typeof result.changes === 'number') parts.push(`changes=${result.changes}`)
  if (typeof result.capturedChanges === 'number')
    parts.push(`capturedChanges=${result.capturedChanges}`)
  if (parts.length) console.log(parts.join(' '))
}

async function runRepl() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log(`Connected to ${origin}  (.help, .quit)`)
  try {
    for (;;) {
      const line = (await rl.question('sql> ')).trim()
      if (!line) continue
      if (line === '.quit' || line === '.exit') break
      if (line === '.help') {
        console.log('Enter SQL. Use ? placeholders; params not supported in REPL yet.')
        console.log("One-shot: bun run prod-sql -- 'SELECT ?' -- value")
        continue
      }
      try {
        printResult(await execSql(line))
      } catch (error) {
        console.error(error instanceof Error ? error.message : error)
      }
    }
  } finally {
    rl.close()
  }
}

const parsed = parseArgs(process.argv)
if (parsed === 'repl') {
  await runRepl()
} else {
  try {
    printResult(await execSql(parsed.sql, parsed.params))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
