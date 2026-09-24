import { createBetterAuthClient } from '@vxrn/better-auth'
import { getURL } from 'one'

export const { authClient, setAuthClientToken, useAuth } = createBetterAuthClient({
  baseURL: `${getURL()}/api/auth`,
})
