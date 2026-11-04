import { execFileSync } from 'bun:child_process'
import { appendFileSync } from 'bun:fs'
import { readReleaseTrailers } from '../check-commit-message'
import { verifyMainIntents } from './provenance'
import { git, jsonAt, RELEASE_BRANCH, type ReleaseState, verifyCandidate } from './versioning'

export function api(path: string) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }))
}

export function verifyRelease(commit: string, repository: string) {
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error('Invalid release coordinates')
  if (git(['merge-base', 'origin/main', commit]) !== commit)
    throw new Error('Release commit is not on main')
  const state = jsonAt<ReleaseState>(commit, 'release.json')
  if (!state.candidate || state.candidate.sourceCommit !== git(['rev-parse', `${commit}^`]))
    throw new Error('Not a release merge')
  const result = verifyCandidate(commit)
  verifyMainIntents(result.entries, repository)
  const prs = api(`repos/${repository}/commits/${commit}/pulls`)
  const pr = prs.find(
    (item: any) =>
      item.merged_at &&
      item.merge_commit_sha === commit &&
      item.base.ref === 'main' &&
      item.head.ref === RELEASE_BRANCH &&
      item.head.repo?.full_name === repository
  )
  if (!pr) throw new Error('No matching merged in-repository release PR')
  const intent = readReleaseTrailers(git(['show', '-s', '--format=%B', commit]))
  const bodyIntent = readReleaseTrailers(`${pr.title}\n\n${pr.body || ''}`)
  const expected = {
    releaseType: state.candidate.releaseType,
    nativeChange: state.candidate.nativeChange,
  }
  if (
    JSON.stringify(intent) !== JSON.stringify(expected) ||
    JSON.stringify(bodyIntent) !== JSON.stringify(expected)
  )
    throw new Error('Release merge intent changed after validation')
  return {
    version: result.version,
    commit,
    runtime: state.native.runtimeVersion,
    native_version: state.native.version,
    native_build: String(state.native.build),
    native_change: state.candidate.nativeChange ? 'yes' : 'no',
    tag: `v${result.version}`,
  }
}

if (import.meta.main) {
  try {
    const output = verifyRelease(
      process.argv[2] || git(['rev-parse', 'HEAD']),
      process.env.GITHUB_REPOSITORY!
    )
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        Object.entries(output)
          .map(([key, value]) => `${key}=${value}\n`)
          .join('')
      )
    console.log(JSON.stringify(output))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
