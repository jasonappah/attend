import { describe, expect, test } from 'bun:test'
import {
  aggregate,
  allocate,
  bump,
  nativeChanges,
  type ReleaseState,
  validateState,
} from './versioning'

const base = 'a'.repeat(40)
const head = 'b'.repeat(40)
const state: ReleaseState = {
  schemaVersion: 1,
  bootstrapCommit: base,
  native: { version: '1.1.371', build: 1, runtimeVersion: '1.0.0' },
  candidate: null,
}

describe('release identities', () => {
  test('semver patch has no artificial two-digit limit', () => {
    expect(bump('1.1.371', 'patch')).toBe('1.1.372')
    expect(bump('1.1.371', 'minor')).toBe('1.2.0')
    expect(bump('1.1.371', 'major')).toBe('2.0.0')
  })
  test('highest intent and any native yes win', () => {
    expect(
      aggregate([
        { releaseType: 'major', nativeChange: false },
        { releaseType: 'patch', nativeChange: true },
      ])
    ).toEqual({ releaseType: 'major', nativeChange: true })
    expect(() => aggregate([])).toThrow('No unreleased')
  })
  test('OTA releases retain installed binary and runtime identities', () => {
    const result = allocate(
      '1.1.371',
      state,
      { releaseType: 'minor', nativeChange: false },
      base,
      head
    )
    expect(result.version).toBe('1.2.0')
    expect(result.state.native).toEqual(state.native)
  })
  test('native build is independent of semver and preparation is deterministic', () => {
    const args = [
      '1.1.371',
      state,
      { releaseType: 'patch', nativeChange: true },
      base,
      head,
    ] as const
    const result = allocate(...args)
    expect(result.state.native).toEqual({ version: '1.1.372', build: 2, runtimeVersion: '2.0.0' })
    expect(allocate(...args)).toEqual(result)
    expect(state.native.build).toBe(1)
  })
  test('invalid versions, state and build overflow fail closed', () => {
    for (const version of ['v1.0.0', '1.0', '01.0.0', '1.0.0-beta', '999999999999999999.0.0'])
      expect(() => bump(version, 'patch')).toThrow()
    expect(() => validateState({ ...state, native: { ...state.native, build: 0 } })).toThrow()
    expect(() =>
      allocate(
        '1.0.0',
        { ...state, native: { ...state.native, build: 2_100_000_000 } },
        { releaseType: 'patch', nativeChange: true },
        base,
        head
      )
    ).toThrow()
  })
  test('native guard detects dependency, native code, patches, and lockfile changes', () => {
    const pkg = JSON.stringify({ version: '1.0.0', dependencies: { react: '19' } })
    const versionOnly = JSON.stringify({ version: '1.0.1', dependencies: { react: '19' } })
    expect(nativeChanges(['package.json'], pkg, versionOnly)).toBe(false)
    expect(nativeChanges(['features/calendar/Calendar.tsx'], pkg, pkg)).toBe(false)
    for (const path of [
      'android/app/build.gradle',
      'ios/App.swift',
      'patches/foo.patch',
      'bun.lock',
      'vite.config.ts',
    ])
      expect(nativeChanges([path], pkg, pkg)).toBe(true)
    expect(
      nativeChanges(['package.json'], pkg, JSON.stringify({ dependencies: { react: '20' } }))
    ).toBe(true)
  })
})
