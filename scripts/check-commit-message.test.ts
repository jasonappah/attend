import { describe, expect, test } from 'bun:test'
import { validateCommitMessage } from './check-commit-message'

const message = (trailers: string) => `Update attendance\n\n${trailers}\n`

describe('commit release metadata', () => {
  for (const release of ['patch', 'minor', 'major']) {
    for (const native of ['yes', 'no']) {
      test(`accepts ${release} / ${native}`, () => {
        expect(
          validateCommitMessage(message(`Release-Type: ${release}\nNative-Change: ${native}`))
        ).toEqual([])
      })
    }
  }

  test('requires both trailers', () => {
    expect(validateCommitMessage('Update attendance\n')).toHaveLength(2)
    expect(validateCommitMessage(message('Release-Type: patch'))).toHaveLength(1)
    expect(validateCommitMessage(message('Native-Change: yes'))).toHaveLength(1)
  })

  test('rejects unknown, empty, and incorrectly cased values', () => {
    for (const value of ['none', '', 'PATCH']) {
      expect(
        validateCommitMessage(message(`Release-Type: ${value}\nNative-Change: no`))
      ).not.toEqual([])
    }
    expect(validateCommitMessage(message('Release-Type: patch\nNative-Change: true'))).not.toEqual(
      []
    )
  })

  test('rejects duplicate trailers even when values agree or keys differ in case', () => {
    for (const extra of ['Release-Type: patch', 'release-type: minor', 'Native-Change: no']) {
      expect(
        validateCommitMessage(message(`Release-Type: patch\nNative-Change: no\n${extra}`))
      ).not.toEqual([])
    }
  })

  test('does not accept metadata in the subject or earlier prose', () => {
    expect(validateCommitMessage('Release-Type: patch\nNative-Change: no\n')).not.toEqual([])
    expect(
      validateCommitMessage(
        message('Release-Type: patch\nNative-Change: no\n\nMore description follows.')
      )
    ).not.toEqual([])
  })

  test('accepts CRLF, editor comments, and unrelated trailers', () => {
    expect(
      validateCommitMessage(
        message(
          'Native-Change: yes\nRelease-Type: minor\nSigned-off-by: Developer <dev@example.com>\n\n# Editor instructions'
        ).replaceAll('\n', '\r\n')
      )
    ).toEqual([])
  })

  test('rejects folded values with extra text', () => {
    expect(
      validateCommitMessage(message('Release-Type: patch\n  or minor\nNative-Change: no'))
    ).not.toEqual([])
  })
})
