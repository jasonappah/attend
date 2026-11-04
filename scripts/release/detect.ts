import { appendFileSync } from 'bun:fs'
import { git, jsonAt, type ReleaseState, validateState } from './versioning'

// A release commit is the squash merge of the release PR. Subsequent ordinary
// main commits keep the last candidate in release.json, so the parent check is
// what distinguishes "a release landed" from "a release landed earlier".
export function releaseStatus(commit: string, cwd?: string) {
  const state = validateState(jsonAt<ReleaseState>(commit, 'release.json', cwd))
  if (!state.candidate) return { isRelease: false as const }
  const parent = git(['rev-parse', `${commit}^`], cwd)
  if (parent !== state.candidate.sourceCommit) return { isRelease: false as const }
  return {
    isRelease: true as const,
    version: jsonAt<{ version: string }>(commit, 'package.json', cwd).version,
    nativeChange: state.candidate.nativeChange ? ('yes' as const) : ('no' as const),
  }
}

if (import.meta.main) {
  try {
    const result = releaseStatus(git(['rev-parse', 'HEAD']))
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `is_release=${result.isRelease}\nversion=${result.isRelease ? result.version : ''}\nnative_change=${result.isRelease ? result.nativeChange : ''}\n`
      )
    }
    console.log(JSON.stringify(result))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
