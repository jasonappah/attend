import { appendFileSync, writeFileSync } from 'node:fs'
import { verifyMainIntents } from './provenance'
import { calculate, git, jsonAt } from './versioning'

export function prepare(cwd = process.cwd()) {
  const head = git(['rev-parse', 'HEAD'], cwd)
  const result = calculate(head, cwd)
  if (process.env.GITHUB_ACTIONS === 'true')
    verifyMainIntents(result.entries, process.env.GITHUB_REPOSITORY!)
  const pkg = jsonAt<{ version: string }>(head, 'package.json', cwd)
  pkg.version = result.version
  writeFileSync(`${cwd}/package.json`, `${JSON.stringify(pkg, null, 2)}\n`)
  writeFileSync(`${cwd}/release.json`, `${JSON.stringify(result.state, null, 2)}\n`)
  const hasChangelog = git(['ls-tree', '--name-only', head, '--', 'CHANGELOG.md'], cwd) !== ''
  const previous = hasChangelog
    ? git(['show', `${head}:CHANGELOG.md`], cwd).replace(/^# Changelog\s*/, '')
    : ''
  const changelog = result.entries
    .map((entry) => `- ${entry.subject} (${entry.commit.slice(0, 7)})`)
    .join('\n')
  writeFileSync(
    `${cwd}/CHANGELOG.md`,
    `# Changelog\n\n## ${result.version}\n\n${changelog}\n\n${previous}`
  )
  const intent = result.state.candidate!
  const outputs = {
    version: result.version,
    release_type: intent.releaseType,
    native_change: intent.nativeChange ? 'yes' : 'no',
    source_commit: head,
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join('')
    )
  }
  return outputs
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(prepare()))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
