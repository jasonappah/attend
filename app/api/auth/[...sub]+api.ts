import { auth } from '~/better-auth/auth'

const handler = auth.handler
export { handler as GET, handler as POST }
