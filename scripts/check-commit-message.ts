import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const requirements = {
  'Release-Type': ['patch', 'minor', 'major'],
  'Native-Change': ['yes', 'no'],
}

/** Trailers GitHub/Cursor commonly append after the PR body's own footer. */
const ATTRIBUTION_TRAILER =
  /^(Co-authored-by|Signed-off-by|Acked-by|Reviewed-by|Helped-by|Reported-by|Tested-by|Suggested-by|Cc|Requested-by)\s*:/i

const SEPARATOR_LINE = /^-{3,}\s*$/

function parseTrailersWithGit(message: string) {
  const result = spawnSync('git', ['interpret-trailers', '--parse'], {
    input: message,
    encoding: 'utf8',
  })
  if (result.error || result.status !== 0) {
    throw new Error('Could not parse commit trailers with git interpret-trailers.')
  }
  return result.stdout
}

function hasRequiredTrailers(parsed: string) {
  const lines = parsed.trim() ? parsed.trim().split('\n') : []
  return Object.keys(requirements).every(
    (key) =>
      lines.filter((line) => line.toLowerCase().startsWith(`${key.toLowerCase()}:`)).length === 1
  )
}

/**
 * Squash merges often keep PR-body trailers, then append a blank line, a
 * `---------` separator, and `Co-authored-by` lines. Git's trailer block is
 * only the final contiguous footer, so those appendages hide Release-Type /
 * Native-Change from `interpret-trailers --parse`. Strip that trailing
 * attribution so the intended release footer is visible again.
 */
export function stripTrailingAttribution(message: string): string {
  const lines = message.replaceAll('\r\n', '\n').split('\n')
  let end = lines.length
  let changed = true
  while (changed) {
    changed = false
    while (end > 0 && lines[end - 1]!.trim() === '') {
      end -= 1
      changed = true
    }
    let removedAttribution = false
    while (end > 0 && ATTRIBUTION_TRAILER.test(lines[end - 1]!.trim())) {
      end -= 1
      removedAttribution = true
      changed = true
    }
    while (end > 0 && lines[end - 1]!.trim() === '') {
      end -= 1
      changed = true
    }
    if (removedAttribution && end > 0 && SEPARATOR_LINE.test(lines[end - 1]!.trim())) {
      end -= 1
      changed = true
    }
  }
  return `${lines.slice(0, end).join('\n')}\n`
}

function trailersForValidation(message: string) {
  const parsed = parseTrailersWithGit(message)
  if (hasRequiredTrailers(parsed)) return parsed
  const retry = parseTrailersWithGit(stripTrailingAttribution(message))
  return hasRequiredTrailers(retry) ? retry : parsed
}

export function validateCommitMessage(message: string): string[] {
  // Let Git recognize the footer, comments, and folded trailer values rather
  // than accepting matching text anywhere in the subject or prose. When
  // GitHub appends co-author trailers after the PR body, strip that
  // attribution first so the release trailers remain the footer.
  const trailers = trailersForValidation(message).trim().split('\n')
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
  const parsed = trailersForValidation(message)
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
