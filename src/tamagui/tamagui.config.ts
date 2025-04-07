import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

const config = createTamagui(defaultConfig)


export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config