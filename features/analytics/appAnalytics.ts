import { createStorageValue } from '@o/helpers'
import {
  type AppAnalyticsInstallationState,
  createAppAnalyticsClient,
} from 'takeout-better-auth/analytics'
import { SERVER_URL } from '~/constants'
import { uuidv7 } from '~/helpers/uuid'

const installationStorage = createStorageValue<AppAnalyticsInstallationState>(
  'app-analytics-installation-id'
)

export const appAnalytics = createAppAnalyticsClient({
  serverUrl: SERVER_URL,
  installationStorage,
  createInstallationId: () => uuidv7(),
})
