import { getURL } from 'one'

// brand
export const APP_NAME = 'Attend'
export const APP_NAME_LOWERCASE = APP_NAME.toLowerCase()
export const APP_SCHEME = 'attend'
// the one sentence under the name on the landing page
export const APP_TAGLINE = 'A simple way to track your class attendance.'

// domain
export const DOMAIN = process.env.VITE_WEB_HOSTNAME || 'localhost:4200'
export const ADMIN_EMAIL = `admin@${DOMAIN}`

// auth/demoIdentity is also imported by static seed data, so keep its identity
// exports separate from this module's runtime getURL dependency.
export { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD, DEMO_USER_ID } from './auth/demoIdentity'

export const SERVER_URL = getURL()

// community
export const DISCORD_INVITE_URL = 'https://discord.gg/4qh6tdcVDa'
