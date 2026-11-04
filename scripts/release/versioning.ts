import { execFileSync } from 'bun:child_process'
import { readReleaseTrailers } from '../check-commit-message'

export type ReleaseType = 'patch' | 'minor' | 'major'
export type Intent = { releaseType: ReleaseType; nativeChange: boolean }
export type ReleaseState = {
  schemaVersion: 1
  bootstrapCommit: string
  native: { version: string; build: number; runtimeVersion: string }
  candidate: (Intent & { baseCommit: string; sourceCommit: string }) | null
}

export const RELEASE_FILES = ['package.json', 'release.json', 'CHANGELOG.md']
export const RELEASE_BRANCH = 'release/next'
const rank = { patch: 0, minor: 1, major: 2 }
const sha = /^[a-f0-9]{40}$/

export function git(args: string[], cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trimEnd()
}

export function bump(version: string, type: ReleaseType) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Invalid release version: ${version}`)
  }
  const parts = version.split('.').map(Number)
  const index = { major: 0, minor: 1, patch: 2 }[type]
  parts[index] = parts[index]! + 1
  for (let i = index + 1; i < parts.length; i++) parts[i] = 0
  if (parts.some((n) => !Number.isSafeInteger(n))) throw new Error('Version overflow')
  return parts.join('.')
}

export function aggregate(intents: Intent[]): Intent {
  if (!intents.length) throw new Error('No unreleased commits')
  return intents.reduce((result, next) => ({
    releaseType:
      rank[next.releaseType] > rank[result.releaseType] ? next.releaseType : result.releaseType,
    nativeChange: result.nativeChange || next.nativeChange,
  }))
}

export function validateState(input: unknown): ReleaseState {
  const state = input as ReleaseState
  if (!state || state.schemaVersion !== 1 || !sha.test(state.bootstrapCommit)) {
    throw new Error('Invalid release state/bootstrap boundary')
  }
  bump(state.native?.version, 'patch')
  bump(state.native?.runtimeVersion, 'patch')
  if (
    !Number.isSafeInteger(state.native.build) ||
    state.native.build < 1 ||
    state.native.build > 2_100_000_000
  ) {
    throw new Error('Invalid native build number')
  }
  if (state.candidate !== null) {
    const candidate = state.candidate
    if (
      !candidate ||
      !sha.test(candidate.baseCommit) ||
      !sha.test(candidate.sourceCommit) ||
      !Object.hasOwn(rank, candidate.releaseType) ||
      typeof candidate.nativeChange !== 'boolean'
    ) {
      throw new Error('Invalid release candidate')
    }
  }
  return state
}

export function allocate(
  version: string,
  state: ReleaseState,
  intent: Intent,
  baseCommit: string,
  sourceCommit: string
) {
  validateState(state)
  const nextVersion = bump(version, intent.releaseType)
  const next: ReleaseState = {
    ...state,
    native: intent.nativeChange
      ? {
          version: nextVersion,
          build: state.native.build + 1,
          runtimeVersion: bump(state.native.runtimeVersion, 'major'),
        }
      : { ...state.native },
    candidate: { ...intent, baseCommit, sourceCommit },
  }
  return { version: nextVersion, state: validateState(next) }
}

export function changedPaths(base: string, head: string, cwd?: string) {
  return git(['diff', '--name-only', '--no-renames', base, head], cwd).split('\n').filter(Boolean)
}

export function nativeChanges(paths: string[], beforePackage: string, afterPackage: string) {
  // Unknown lockfile changes are conservative: a transitive native upgrade can
  // change the runtime even when the root manifest's range stays the same.
  if (
    paths.some(
      (path) =>
        /^(android\/|ios\/|patches\/|packages\/takeout-(native|notifications|swipeable)\/|bun\.lock$|vite\.config\.ts$|react-native\.config\.)/.test(
          path
        ) || /\.(swift|kt|java|m|mm|h|podspec)$/.test(path)
    )
  )
    return true
  const before = JSON.parse(beforePackage)
  const after = JSON.parse(afterPackage)
  return JSON.stringify(before.dependencies) !== JSON.stringify(after.dependencies)
}

export function jsonAt<T>(commit: string, path: string, cwd?: string): T {
  return JSON.parse(git(['show', `${commit}:${path}`], cwd))
}

export function calculate(head: string, cwd?: string) {
  const state = validateState(jsonAt(head, 'release.json', cwd))
  const pkg = jsonAt<{ version: string }>(head, 'package.json', cwd)
  const base = state.candidate
    ? git(['log', '-1', '--format=%H', head, '--', 'release.json'], cwd)
    : state.bootstrapCommit
  if (git(['merge-base', base, head], cwd) !== base)
    throw new Error('Release boundary is not an ancestor')
  const commits = git(['rev-list', '--reverse', '--first-parent', `${base}..${head}`], cwd)
    .split('\n')
    .filter(Boolean)
  const entries = commits.map((commit) => {
    const message = git(['show', '-s', '--format=%B', commit], cwd)
    const intent = readReleaseTrailers(message)
    const parent = git(['rev-parse', `${commit}^`], cwd)
    const paths = changedPaths(parent, commit, cwd)
    if (
      nativeChanges(
        paths,
        git(['show', `${parent}:package.json`], cwd),
        git(['show', `${commit}:package.json`], cwd)
      ) &&
      !intent.nativeChange
    ) {
      throw new Error(`${commit}: native-affecting changes require Native-Change: yes`)
    }
    return { commit, subject: message.split('\n')[0]!, intent }
  })
  const intent = aggregate(entries.map((entry) => entry.intent))
  return { ...allocate(pkg.version, state, intent, base, head), entries }
}

export function verifyCandidate(head: string, cwd?: string) {
  const state = validateState(jsonAt(head, 'release.json', cwd))
  if (!state.candidate) throw new Error('No release candidate')
  const parent = git(['rev-parse', `${head}^`], cwd)
  if (parent !== state.candidate.sourceCommit)
    throw new Error('Stale release PR: update it against current main')
  const expected = calculate(parent, cwd)
  if (JSON.stringify(state) !== JSON.stringify(expected.state))
    throw new Error('Release state does not match source commits')
  const paths = changedPaths(parent, head, cwd)
  if (
    !paths.includes('release.json') ||
    !paths.includes('package.json') ||
    paths.some((path) => !RELEASE_FILES.includes(path))
  ) {
    throw new Error('Release PR must only update package version, release state, and changelog')
  }
  const before = jsonAt<Record<string, unknown>>(parent, 'package.json', cwd)
  const after = jsonAt<Record<string, unknown>>(head, 'package.json', cwd)
  if (
    after.version !== expected.version ||
    JSON.stringify({ ...after, version: before.version }) !== JSON.stringify(before)
  ) {
    throw new Error('Release PR may only change package.json version')
  }
  return expected
}
