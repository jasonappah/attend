import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'

const config = {
    plugins: [
      one({
        native: {bundler: 'metro'},
        web: {
          defaultRenderMode: 'spa',
          deploy: 'vercel',
        },
        setupFile: './src/setup.ts',
        deps: {
          '@expo/vector-icons': {
            '**/*.js': ['jsx'],
          },
          'expo-sqlite': {
            '**/*.js': ['jsx'],
          },
        },
        react: {
          compiler: false,
        },
      }),
      tamaguiPlugin({
        optimize: true,
        components: ['tamagui'],
        config: './src/tamagui/tamagui.config.ts',
        outputCSS: './src/tamagui/tamagui.css',
      }),
    ],
    optimizeDeps: {
      include: ['@tamagui/core', '@tamagui/config'],
    },
    build: {
      cssTarget: 'safari15',
    },
  }

export default config
