import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const requirements = {
  'Release-Type': ['patch', 'minor', 'major'],
  'Native-Change': ['yes', 'no'],
}

export function validateCommitMessage(message: string): string[] {
  // Let Git recognize the footer, comments, and folded trailer values rather
  // than accepting matching text anywhere in the subject or prose.
  const result = spawnSync('git', ['interpret-trailers', '--parse'], {
    input: message,
    encoding: 'utf8',
  })
  if (result.error || result.status !== 0) {
    throw new Error('Could not parse commit trailers with git interpret-trailers.')
  }

  const trailers = result.stdout.trim().split('\n')
  const errors: string[] = []
  for (const [key, allowed] of Object.entries(requirements)) {
    const entries = trailers.filter((line) =>
      line.toLowerCase().startsWith(`${key.toLowerCase()}:`)
    )
    if (entries.length !== 1) {
      errors.push(`Include exactly one ${key}: ${allowed.join('|')} trailer.`)
      continue
    }
    const entry = entries[0]!
    const value = entry.slice(entry.indexOf(':') + 1).trim()
    if (!entry.startsWith(`${key}:`) || !allowed.includes(value)) {
      errors.push(`Use ${key}: ${allowed.join('|')} (case-sensitive).`)
    }
  }
  return errors
}

export function readReleaseTrailers(message: string) {
  const errors = validateCommitMessage(message)
  if (errors.length) throw new Error(errors.join('\n'))
  const parsed = spawnSync('git', ['interpret-trailers', '--parse'], {
    input: message,
    encoding: 'utf8',
  }).stdout
  return {
    releaseType: parsed.match(/^Release-Type: (patch|minor|major)$/m)![1] as
      | 'patch'
      | 'minor'
      | 'major',
    nativeChange: parsed.match(/^Native-Change: (yes|no)$/m)![1] === 'yes',
  }
}

if (import.meta.main) {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: bun scripts/check-commit-message.ts <commit-message-file>')
    process.exit(1)
  }
  try {
    const errors = validateCommitMessage(readFileSync(path, 'utf8'))
    if (errors.length) {
      console.error(
        `Commit rejected:\n${errors.map((error) => `- ${error}`).join('\n')}\n\n` +
          'End the commit body with a blank line followed by:\n\n' +
          'Release-Type: patch\nNative-Change: no\n\n' +
          'Use Native-Change: yes when native code, native dependencies, or native configuration changes.'
      )
      process.exit(1)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
