import { defaultConfig } from '@tamagui/config/v5'
import { createTamagui } from 'tamagui'
import { animations } from './animations'

const config = createTamagui({
  ...defaultConfig,
  animations,
})

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config
