// Ambient declarations for Bun native modules used by the release scripts.
// bun-types only ships declarations for a few `bun:*` subpaths (test, sqlite,
// ffi, bundle, jsc), so the rest are declared here to match the runtime API.

// ----- bun:child_process ---------------------------------------------------

declare module 'bun:child_process' {
  export function execFileSync(
    file: string,
    args?: readonly string[],
    options?: {
      cwd?: string | URL
      encoding?: 'utf8' | 'buffer'
      stdio?: any
      input?: string | Uint8Array
    }
  ): string

  export function spawnSync(
    file: string,
    args?: readonly string[],
    options: { encoding: 'utf8'; stdio?: any; input?: string | Uint8Array }
  ): {
    pid: number
    output: Array<string | null>
    stdout: string
    stderr: string
    status: number | null
    signal: string | null
    error: Error | null
  }
  export function spawnSync(
    file: string,
    args?: readonly string[],
    options?: { encoding?: 'buffer'; stdio?: any; input?: string | Uint8Array }
  ): {
    pid: number
    output: Array<Uint8Array | null>
    stdout: Uint8Array
    stderr: Uint8Array
    status: number | null
    signal: string | null
    error: Error | null
  }
}

// ----- bun:crypto ----------------------------------------------------------

declare module 'bun:crypto' {
  export function createHash(algorithm: string): Hash
  export interface Hash {
    update(data: string | ArrayBufferView): this
    digest(encoding: 'base64url' | 'hex' | 'latin1'): string
    digest(): Uint8Array
  }
}

// ----- bun:fs --------------------------------------------------------------

declare module 'bun:fs' {
  interface Stats {
    isFile(): boolean
    isDirectory(): boolean
    isBlockDevice(): boolean
    isCharacterDevice(): boolean
    isSymbolicLink(): boolean
    isFIFO(): boolean
    isSocket(): boolean
  }

  // readFileSync: encoding can be passed as 'utf8' string or {encoding: 'utf8'} object
  export function readFileSync(path: string | URL, encoding: 'utf8'): string
  export function readFileSync(path: string | URL, options: { encoding: 'utf8' }): string
  export function readFileSync(path: string | URL): Uint8Array

  export function writeFileSync(
    path: string | URL,
    data: string | Uint8Array,
    options?: { encoding?: string; mode?: number; flag?: string }
  ): void
  export function appendFileSync(
    path: string | URL,
    data: string | Uint8Array,
    options?: { encoding?: string; mode?: number; flag?: string }
  ): void
  export function readdirSync(path: string | URL): string[]
  export function statSync(path: string | URL): Stats
  export function lstatSync(path: string | URL): Stats
  export function mkdtempSync(prefix: string): string
  export function mkdirSync(
    path: string | URL,
    options?: { recursive?: boolean; mode?: number }
  ): void
  export function renameSync(path: string | URL, newPath: string | URL): void
  export function rmSync(
    path: string | URL,
    options?: { recursive?: boolean; force?: boolean; maxRetries?: number }
  ): void

  export function readFile(path: string | URL, encoding: 'utf8'): Promise<string>
  export function readFile(path: string | URL, options: { encoding: 'utf8' }): Promise<string>
  export function readFile(path: string | URL): Promise<Uint8Array>
  export function writeFile(
    path: string | URL,
    data: string | Uint8Array,
    options?: { encoding?: string; mode?: number; flag?: string }
  ): Promise<void>
  export function rm(
    path: string | URL,
    options?: { recursive?: boolean; force?: boolean; maxRetries?: number }
  ): Promise<void>
  export function mkdtemp(prefix: string): Promise<string>
  export function lstat(path: string | URL): Promise<Stats>
  export function mkdir(
    path: string | URL,
    options?: { recursive?: boolean; mode?: number }
  ): Promise<void>
}

// ----- bun:os --------------------------------------------------------------

declare module 'bun:os' {
  export function tmpdir(): string
}

// ----- bun:path ------------------------------------------------------------

declare module 'bun:path' {
  export function join(...paths: string[]): string
  export function resolve(...paths: string[]): string
}

// ----- bun:util ------------------------------------------------------------

declare module 'bun:util' {
  export interface ParseArgsOptions {
    options?: Record<string, { type: 'string' | 'boolean' }>
    allowPositionals?: boolean
    strict?: boolean
  }
  export function parseArgs(options: ParseArgsOptions): {
    values: Record<string, string | string[] | boolean | undefined>
    positionals: string[]
  }
}
