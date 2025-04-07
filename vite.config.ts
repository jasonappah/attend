import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { defineConfig } from 'vite'
import { loadEnv } from 'vxrn'

const config = defineConfig(async () => {
  return {
    plugins: [
      one({
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
          scan: false,
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
    ssr: {
      noExternal: true,
    },
    optimizeDeps: {
      include: ['@tamagui/core', '@tamagui/config'],
    },
    build: {
      cssTarget: 'safari15',
    },
  }
})

export default config
