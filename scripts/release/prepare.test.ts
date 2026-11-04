import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { releaseStatus } from './detect'
import { prepare } from './prepare'
import { calculate, git, verifyCandidate } from './versioning'

const directories: string[] = []
afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function commit(dir: string, subject: string, type = 'patch', native = 'no') {
  git(['add', '.'], dir)
  git(
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '-qm',
      `${subject}\n\nRelease-Type: ${type}\nNative-Change: ${native}`,
    ],
    dir
  )
  return git(['rev-parse', 'HEAD'], dir)
}

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'attend-release-test-'))
  directories.push(dir)
  git(['init', '-q', '-b', 'main', dir])
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.1.371', dependencies: {} })
  )
  const state = {
    schemaVersion: 1,
    bootstrapCommit: 'a'.repeat(40),
    native: { version: '1.1.371', build: 1, runtimeVersion: '1.0.0' },
    candidate: null,
  }
  writeFileSync(join(dir, 'release.json'), JSON.stringify(state))
  state.bootstrapCommit = commit(dir, 'old baseline')
  writeFileSync(join(dir, 'release.json'), JSON.stringify(state))
  commit(dir, 'establish release boundary')
  return dir
}

describe('release preparation in a real Git repository', () => {
  test('prepares, verifies, and excludes its metadata commit from the next range', () => {
    const dir = fixture()
    writeFileSync(join(dir, 'feature.ts'), 'export const feature = true\n')
    commit(dir, 'feature', 'minor', 'yes')
    const head = git(['rev-parse', 'HEAD'], dir)
    const first = prepare(dir)
    expect(first.version).toBe('1.2.0')
    const firstFiles = ['package.json', 'release.json', 'CHANGELOG.md'].map((path) =>
      readFileSync(join(dir, path), 'utf8')
    )
    expect(prepare(dir)).toEqual(first)
    expect(
      ['package.json', 'release.json', 'CHANGELOG.md'].map((path) =>
        readFileSync(join(dir, path), 'utf8')
      )
    ).toEqual(firstFiles)
    const release = commit(dir, 'release', 'minor', 'yes')
    expect(verifyCandidate(release, dir).state.candidate?.sourceCommit).toBe(head)
    expect(releaseStatus(release, dir)).toEqual({
      isRelease: true,
      version: '1.2.0',
      nativeChange: 'yes',
    })
    writeFileSync(join(dir, 'feature.ts'), 'export const feature = false\n')
    commit(dir, 'fix feature')
    expect(releaseStatus(git(['rev-parse', 'HEAD'], dir), dir)).toEqual({ isRelease: false })
    const next = calculate(git(['rev-parse', 'HEAD'], dir), dir)
    expect(next.entries).toHaveLength(1)
    expect(next.version).toBe('1.2.1')
    expect(next.state.native).toEqual({ version: '1.2.0', build: 2, runtimeVersion: '2.0.0' })
  })

  test('rejects native no and malformed commit intent', () => {
    const dir = fixture()
    mkdirSync(join(dir, 'android'))
    writeFileSync(join(dir, 'android/native.txt'), 'native')
    commit(dir, 'native edit')
    expect(() => calculate(git(['rev-parse', 'HEAD'], dir), dir)).toThrow('Native-Change: yes')
  })

  test('rejects forged metadata-only release PRs and stale candidates', () => {
    const dir = fixture()
    prepare(dir)
    writeFileSync(join(dir, 'unrelated.ts'), 'unauthorized release diff')
    const forged = commit(dir, 'release')
    expect(() => verifyCandidate(forged, dir)).toThrow('only update')
    writeFileSync(join(dir, 'unrelated.ts'), 'later change')
    const stale = commit(dir, 'later change')
    expect(() => verifyCandidate(stale, dir)).toThrow('Stale')
  })
})
