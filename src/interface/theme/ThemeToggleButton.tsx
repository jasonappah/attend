import { View } from '@tamagui/core'
import { Moon, Sun, SunMoon } from 'lucide-react-native'
import { useUserScheme } from 'one'
import { Appearance } from 'react-native'
import { Paragraph, YStack, isWeb, useTheme } from 'tamagui'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ToggleThemeButton() {
  const { onPress, Icon, setting } = useToggleTheme()
  const theme = useTheme()

  return (
    <View group items="center" containerType="normal" gap="1">
      <View
        p="3"
        rounded="10"
        bg="hover:color2 press:color1"
        pointerEvents="auto"
        cursor="pointer"
        onPress={onPress}
      >
        <Icon size={22} color={theme.accent12.get()} />
      </View>

      <YStack>
        <Paragraph transition="100ms" size="1" mb={-20} color="color10" opacity="0 group-hover:1">
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
