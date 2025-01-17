module.exports = (api) => {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/tamagui/tamagui.config.ts',
          themeBuilder: {
            input: './src/tamagui/theme-builder.ts',
            output: './src/tamagui/themes.ts',
          },
          outputCSS: './src/tamagui/tamagui.css',
          logTimings: true,
          // biome-ignore lint/nursery/noProcessEnv: unsure if i can import typed env here
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],

      // NOTE: this is only necessary if you are using reanimated for animations
      'react-native-reanimated/plugin',
    ],
  }
}
