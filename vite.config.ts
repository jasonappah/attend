import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'

const config = {
  plugins: [
    one({
      // Vite (Rolldown) is One's native bundler now. Metro remains available
      // for debugging via `native.bundler: 'metro'`, but builds always use Vite.
      native: {
        bundler: 'vite',
        app: {
          name: 'attend',
          displayName: 'Attend',
          scheme: 'attend',
          version: '1.1.371',
          orientation: 'portrait',
          userInterfaceStyle: 'automatic',
          icon: {
            source: './assets/icon.png',
            backgroundColor: '#ffffff',
          },
          splash: {
            source: './assets/splash.png',
            backgroundColor: '#ffffff',
            resizeMode: 'contain',
          },
          ios: {
            bundleId: 'me.jasonaa.attend',
            deploymentTarget: '17.0',
          },
          android: {
            applicationId: 'me.jasonaa.attend',
            minSdk: 26,
          },
        },
      },

      web: {
        defaultRenderMode: 'spa',
        deploy: 'vercel',
      },

      // pages, api routes, and middlewares build against one server config
      build: {
        server: { unified: true },
      },

      react: {
        compiler: false,
      },
    }),
    tamaguiPlugin({
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
  build: {
    cssTarget: 'safari15',
  },
}

export default config
