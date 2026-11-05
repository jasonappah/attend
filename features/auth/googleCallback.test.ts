import { expect, test } from 'bun:test'
import { googleCallbackToken, isGoogleCallback } from './googleCallback'

test('accepts only the matching sign-in callback and cookie', () => {
  const cookie = 'attend.state=; Max-Age=0, attend.session_token=synthetic%2Fsignature; Path=/'
  const url = `attend://?attempt=nonce&cookie=${encodeURIComponent(cookie)}`
  expect(googleCallbackToken(url, 'attend', 'nonce')).toBe('synthetic/signature')
  expect(googleCallbackToken(url, 'attend', 'other')).toBeNull()
  expect(googleCallbackToken(url.replace('attend://', 'other://'), 'attend', 'nonce')).toBeNull()
  expect(googleCallbackToken('attend://?attempt=nonce', 'attend', 'nonce')).toBeNull()
})

test('reads the session cookie through the secure production prefix', () => {
  const cookie = '__Secure-attend.session_token=synthetic%2Fsignature; Path=/; Secure; HttpOnly'
  const url = `attend://?attempt=nonce&cookie=${encodeURIComponent(cookie)}`
  expect(googleCallbackToken(url, 'attend', 'nonce')).toBe('synthetic/signature')
})

test('reads the session cookie through the host production prefix', () => {
  const cookie = '__Host-attend.session_token=synthetic%2Fsignature; Path=/; Secure; HttpOnly'
  const url = `attend://?attempt=nonce&cookie=${encodeURIComponent(cookie)}`
  expect(googleCallbackToken(url, 'attend', 'nonce')).toBe('synthetic/signature')
})

test('separates our callback from unrelated app links', () => {
  expect(isGoogleCallback('attend://?attempt=nonce', 'attend', 'nonce')).toBe(true)
  expect(isGoogleCallback('attend://?attempt=other', 'attend', 'nonce')).toBe(false)
  expect(isGoogleCallback('other://?attempt=nonce', 'attend', 'nonce')).toBe(false)
  expect(isGoogleCallback('not a url', 'attend', 'nonce')).toBe(false)
})
