import { readFileSync } from 'bun:fs'
import { readReleaseTrailers } from '../check-commit-message'
import {
  aggregate,
  changedPaths,
  git,
  jsonAt,
  nativeChanges,
  RELEASE_BRANCH,
  verifyCandidate,
} from './versioning'

type PullRequest = {
  number: number
  title: string
  body: string | null
  base: { sha: string; ref: string }
  head: { sha: string; ref: string; repo: { full_name: string } | null }
}

export function checkPullRequest(pr: PullRequest, repository: string, cwd?: string) {
  if (
    pr.base.ref !== 'main' ||
    !Number.isSafeInteger(pr.number) ||
    pr.number < 1 ||
    !/^[a-f0-9]{40}$/.test(pr.base.sha) ||
    !/^[a-f0-9]{40}$/.test(pr.head.sha)
  )
    throw new Error('Invalid PR coordinates')
  git(['fetch', '--no-tags', 'origin', `pull/${pr.number}/head`], cwd)
  if (git(['rev-parse', 'FETCH_HEAD'], cwd) !== pr.head.sha)
    throw new Error('PR changed during validation; retry')
  const proposed = readReleaseTrailers(`${pr.title}\n\n${pr.body || ''}`)
  const paths = changedPaths(pr.base.sha, pr.head.sha, cwd)
  const commitIds = git(['rev-list', '--reverse', `${pr.base.sha}..${pr.head.sha}`], cwd)
    .split('\n')
    .filter(Boolean)
  const intents = commitIds.map((commit) =>
    readReleaseTrailers(git(['show', '-s', '--format=%B', commit], cwd))
  )
  const actual = aggregate(intents)
  if (JSON.stringify(proposed) !== JSON.stringify(actual))
    throw new Error(
      'PR trailers must match aggregated commit intent (highest bump; any native yes)'
    )
  if (pr.head.ref === RELEASE_BRANCH) {
    if (pr.head.repo?.full_name !== repository)
      throw new Error('Release PR must originate in this repository')
    verifyCandidate(pr.head.sha, cwd)
    if (git(['rev-parse', `${pr.head.sha}^`], cwd) !== pr.base.sha)
      throw new Error('Release PR is stale')
  } else {
    if (paths.includes('release.json'))
      throw new Error('Only the release PR may change release.json')
    const before = git(['show', `${pr.base.sha}:package.json`], cwd)
    const after = git(['show', `${pr.head.sha}:package.json`], cwd)
    if (JSON.parse(before).version !== JSON.parse(after).version)
      throw new Error('Only the release PR may bump package.json version')
    if (nativeChanges(paths, before, after) && !proposed.nativeChange)
      throw new Error('Native-affecting changes require Native-Change: yes')
  }
  return jsonAt<{ version: string }>(pr.head.sha, 'package.json', cwd).version
}

if (import.meta.main) {
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, 'utf8'))
    const pr = process.argv[2]
      ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
      : event.pull_request
    checkPullRequest(pr, process.env.GITHUB_REPOSITORY!)
    console.log('Release metadata is valid')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
