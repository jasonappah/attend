import 'server-only'
import { APIError } from 'better-auth'
import { DEMO_EMAIL, DEMO_USER_ID } from '~/auth/demoIdentity'
import { server } from '~/env'

let ALLOWED_SIGNUP_EMAILS: Set<string> | null = null

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getAllowedSignupEmails(): Promise<Set<string>> {
  if (ALLOWED_SIGNUP_EMAILS) return ALLOWED_SIGNUP_EMAILS

  const raw = server.ALLOWED_SIGNUP_EMAILS ?? ''
  const emails = raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  ALLOWED_SIGNUP_EMAILS = new Set(await Promise.all(emails.map(sha256Hex)))
  return ALLOWED_SIGNUP_EMAILS
}

export async function beforeCreateUser(user: {
  id: string
  email: string
  name: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  image?: string | null
}) {
  const email = user.email.toLowerCase()

  // When ALLOWED_SIGNUP_EMAILS is set (production), only those addresses may
  // create an account. Addresses are stored as SHA-256 hashes so the email
  // never appears in plain text in the environment. Left unset (local dev),
  // sign-up stays open.
  const allowed = await getAllowedSignupEmails()
  if (allowed.size > 0 && !(await allowed.has(await sha256Hex(email)))) {
    throw APIError.from('FORBIDDEN', {
      message: 'Sign-up is currently restricted to a fixed list of emails.',
      code: 'SIGNUP_RESTRICTED',
    })
  }

  if (email !== DEMO_EMAIL.toLowerCase()) return
  return {
    data: {
      ...user,
      id: DEMO_USER_ID,
    },
  }
}
