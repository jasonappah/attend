import 'dotenv/config';
import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import type { UserConfig } from 'vite'
import { env } from './src/env'

export default {
  plugins: [
    one({
      web: {
        defaultRenderMode: 'spa',
      },
      deps: {
        '@expo/vector-icons': {
          '**/*.js': ['jsx']
        }
      }
    }),

    tamaguiPlugin({
      optimize: env.NODE_ENV === 'production',
      components: ['tamagui'],
      config: './src/tamagui/tamagui.config.ts',
      outputCSS: './src/tamagui/tamagui.css',
    }),
  ],
} satisfies UserConfig
