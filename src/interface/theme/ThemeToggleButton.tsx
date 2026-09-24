import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons-2'
import { useUserScheme } from '@vxrn/color-scheme'
import { Appearance } from 'react-native'
import { Paragraph, YStack, isWeb } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()

  return (
    <View group items="center" containerType="normal" gap="$1">
      <View
        p="$3"
        rounded="$10"
        hoverStyle={{
          bg: '$color2',
        }}
        pressStyle={{
          bg: '$color1',
        }}
        pointerEvents="auto"
        cursor="pointer"
        onPress={onPress}
      >
        <Icon size={22} color="$accent12" />
      </View>

      <YStack>
        <Paragraph
          transition="100ms"
          size="$1"
          mb={-20}
          color="$color10"
          opacity={0}
          $group-hover={{
            opacity: 1,
          }}
        >
          {setting[0].toUpperCase()}
          {setting.slice(1)}
        </Paragraph>
      </YStack>
    </View>
  )
}

export function useToggleTheme() {
  const { setting, value: scheme, set: setSchemeSetting } = useUserScheme()
  const Icon = setting === 'system' ? SunMoon : setting === 'dark' ? Moon : Sun

  return {
    setting,
    scheme,
    Icon,
    onPress: () => {
      const next = schemeSettings[(schemeSettings.indexOf(setting) + 1) % 3]

      if (!isWeb) {
        Appearance.setColorScheme(next === 'system' ? scheme : next)
      }

      setSchemeSetting(next)
    },
  }
}
