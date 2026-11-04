import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { onZeroPlugin } from 'on-zero/vite'
import { one } from 'one/vite'
import { orezSyncCfHostWasm } from 'orez-lite/cloudflare/vite-wasm-loader'
import { orez } from 'orez-lite/vite'
import { nativeReleaseConfig } from './config/release'
import { BACKGROUND_TASKS } from './features/background-tasks/tasks'
import packageInfo from './package.json'
import releaseState from './release.json'

const { tamaguiPlugin } = createRequire(import.meta.url)('@tamagui/vite-plugin')
const portOffset = Number(process.env.PORT_OFFSET || 0)
const webPort = 4200 + portOffset
const appIdentity = nativeReleaseConfig(releaseState, process.env)
process.env.ONE_PUBLIC_RELEASE_VERSION = packageInfo.version
process.env.ONE_PUBLIC_APP_VARIANT = appIdentity.variant
process.env.ONE_PUBLIC_GIT_SHA =
  process.env.ONE_PUBLIC_GIT_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: import.meta.dirname, encoding: 'utf8' }).trim()

export default {
  root: import.meta.dirname,

  plugins: [
    ...orezSyncCfHostWasm({ runtime: 'workerd' }),
    orez(),
    tamaguiPlugin({ config: './tamagui/tamagui.config.ts' }),

    one({
      setupFile: {
        native: './setupNative.ts',
      },

      // scan every fs route as an optimizer entry. the flat default omits
      // routes nested below depth 3 (feed, profile), whose first-visit
      // discovery re-triggers optimization and 504s in-flight chunks.
      optimization: {
        autoEntriesScanning: true,
      },

      native: {
        app: {
          // the native target name is an identifier; the home screen shows displayName
          name: 'attend',
          displayName: appIdentity.displayName,
          scheme: 'attend',
          version: appIdentity.version,
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
          // the runtime version gates OTA updates: bump this whenever native
          // code or a dependency with native code changes, so One's built-in
          // updates only serve compatible bundles. url points at this app's
          // backend, which serves update files from R2 under the updates/ prefix.
          // updates are disabled in debug builds and until url is set.
          updates: {
            runtimeVersion: appIdentity.runtimeVersion,
            url: appIdentity.updatesUrl,
          },
          icon: { source: './assets/icon.png', backgroundColor: '#e6dac1' },
          splash: { source: './assets/logo.png', backgroundColor: '#e6dac1' },
          ios: {
            buildNumber: String(appIdentity.build),
            bundleId: appIdentity.bundleId,
            tablet: false,
            deploymentTarget: '17.0',
            // declared once per identifier; one stamps them into
            // BGTaskSchedulerPermittedIdentifiers on iOS. refresh tasks carry
            // no requirements; processing tasks can wait for network or power.
            backgroundTasks: {
              refresh: Object.keys(BACKGROUND_TASKS),
              processing: [],
            },
          },
          android: {
            versionCode: appIdentity.build,
            applicationId: appIdentity.bundleId,
            adaptiveIcon: {
              foreground: './assets/adaptive-icon.png',
              backgroundColor: '#e6dac1',
            },
            minSdk: 26,
          },
        },
      },

      web: {
        defaultRenderMode: 'spa',
        skewProtection: 'proactive',
        deploy: {
          target: 'cloudflare',
          url: process.env.ONE_SERVER_URL,
        },
      },

      build: {
        server: {
          unified: true,
        },
      },
    }),

    onZeroPlugin({
      dir: './data',
    }),
  ],

  server: {
    port: webPort,
  },

  // takeout-ui and other vendored packages ship .tsx source. vite pre-bundles only
  // .js/.ts entries by default, so a .tsx entry would load raw and its own imports
  // (tamagui subpaths, CJS react/jsx-runtime) would skip dependency discovery.
  optimizeDeps: {
    extensions: ['.tsx'],
  },

  resolve: {
    dedupe: ['on-zero', '@rocicorp/zero'],
  },

  ssr: {
    // auth packages expose React hooks from package code. bundle them through
    // Vite so SSR uses the renderer's React instance.
    noExternal: ['better-auth', '@o/helpers', 'takeout-better-auth'],
  },
}
