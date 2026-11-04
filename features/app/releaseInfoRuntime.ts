import { One } from 'one'
import { isWeb } from 'tamagui'
import { resolveReleaseInfo } from './releaseInfo'

export function getReleaseInfo() {
  return resolveReleaseInfo({
    platform: isWeb ? 'web' : 'native',
    // __DEV__ is the build's own flag; process.env.NODE_ENV is not guaranteed
    // to survive into a release Hermes bundle.
    development: isWeb ? process.env.NODE_ENV !== 'production' : __DEV__,
    compiled: {
      releaseVersion: process.env.ONE_PUBLIC_RELEASE_VERSION,
      gitSha: process.env.ONE_PUBLIC_GIT_SHA,
      variant: process.env.ONE_PUBLIC_APP_VARIANT,
    },
    appInfo: isWeb ? undefined : One.AppInfo,
    updates: isWeb ? undefined : One.Updates,
  })
}
