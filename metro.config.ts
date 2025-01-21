// Enable Tamagui and add nice web support with optimizing compiler + CSS extraction
const { withTamagui } = require('@tamagui/metro-plugin')
// // run env validation on build
// import { env } from '~/env'

// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')

let config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
})

if (config.resolver) {
  // @ts-ignore
  config = withTamagui(config, {
    components: ['tamagui'],
    config: './src/tamagui/tamagui.config.ts',
    themeBuilder: {
      input: './src/tamagui/theme-builder.ts',
      output: './src/tamagui/themes.ts',
    },
    outputCSS: './src/tamagui/tamagui.css',
  })
  // @ts-ignore
  config.resolver.unstable_enablePackageExports = true
  // @ts-ignore
  config.resolver.sourceExts.push('mjs')
  // @ts-ignore
  config.resolver.sourceExts.push('cjs')
} else {
  throw new Error('No resolver found in metro config')
}

module.exports = config
