import { expect, test } from 'bun:test'
import { googleCallbackToken } from './googleCallback'

test('accepts only the matching sign-in callback and cookie', () => {
  const cookie = 'attend.state=; Max-Age=0, attend.session_token=synthetic%2Fsignature; Path=/'
  const url = `attend://?attempt=nonce&cookie=${encodeURIComponent(cookie)}`
  expect(googleCallbackToken(url, 'attend', 'nonce')).toBe('synthetic/signature')
  expect(googleCallbackToken(url, 'attend', 'other')).toBeNull()
  expect(googleCallbackToken(url.replace('attend://', 'other://'), 'attend', 'nonce')).toBeNull()
  expect(googleCallbackToken('attend://?attempt=nonce', 'attend', 'nonce')).toBeNull()
})
