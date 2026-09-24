import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'

const config = {
    plugins: [
      one({
        // Metro is One's recommended native bundler for production; the Vite/Rolldown native bundler is still alpha
        native: { bundler: 'metro' },
        web: {
          defaultRenderMode: 'spa',
          deploy: 'vercel',
        },
        setupFile: './src/setup.ts',
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
