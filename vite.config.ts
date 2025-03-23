import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { defineConfig } from 'vite'
import { loadEnv } from 'vxrn'

const config = defineConfig(async (args) => {
  await loadEnv(args.command === 'build' ? 'production' : 'development')
  return {
    plugins: [
      one({
        web: {
          defaultRenderMode: 'spa',
        },
        setupFile: './src/setup.ts',
        deps: {
          '@expo/vector-icons': {
            '**/*.js': ['jsx'],
          },
        },
        server: {
          platform: 'node',
        },
        react: {
          scan: false,
          compiler: false,
        },
      }),
      tamaguiPlugin({
        // vxrn loadEnv needs to run before env validation happens
        optimize: await import('./src/env')
          .then((src) => src.env)
          .then((env) => env.NODE_ENV === 'production'),
        components: ['tamagui'],
        config: './src/tamagui/tamagui.config.ts',
        themeBuilder: {
          input: './src/tamagui/theme-builder.ts',
          output: './src/tamagui/themes.ts',
        },
        outputCSS: './src/tamagui/tamagui.css',
      }),
    ],
  }
})

export default config
