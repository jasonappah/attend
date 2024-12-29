import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    one({
      web: {
        defaultRenderMode: 'spa',
      },
      react: {
        scan: true,
      },
      deps: {
        '@expo/vector-icons': {
          '**/*.js': ['jsx'],
        },
      },
      server: {
        platform: 'node',
      },
    }),
    tamaguiPlugin({
      // environment variables get loaded from .env by one plugin on init,
      // so i'm hoping that by the time this gets evaluated, one has finished initializing?
      // and by importing the env, we still make sure the env gets validated on build
      optimize: await import('./src/env').then(src=>src.env).then((env) => env.NODE_ENV === 'production'),
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
} satisfies UserConfig
