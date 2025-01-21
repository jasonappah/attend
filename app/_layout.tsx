import '~/tamagui/tamagui.css'
import './_layout.css'

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { ZeroProvider } from '@rocicorp/zero/react'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { useFonts } from 'expo-font'
import { Slot, SplashScreen } from 'expo-router'
import { useEffect, useState } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { TamaguiProvider, View } from 'tamagui'
import { AuthEffects } from '~/better-auth/AuthEffects'
import { CurrentToast } from '~/interface/CurrentToast'
import { DragDropFile } from '~/interface/upload/DragDropFile'
import config from '~/tamagui/tamagui.config'
import { TRPCProvider } from '~/trpc/provider'
import { useZeroEmit, zero } from '~/zero/zero'

export {
  ErrorBoundary,
  Slot,
} from 'expo-router'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function Layout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  const scheme = useColorScheme()

  return (
    <>
      <AuthEffects />

      <DragDropFile>
        <DataProvider>
          <TamaguiProvider
            disableInjectCSS
            config={config}
            defaultTheme={scheme === 'dark' ? 'dark' : 'light'}
          >
            <ToastProvider swipeDirection="horizontal" duration={6000} native={['mobile']}>
              <TRPCProvider>
                <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
                  <View backgroundColor="$color1" minHeight="100%">
                    <Slot />
                  </View>
                </ThemeProvider>
              </TRPCProvider>
              <CurrentToast />
              <ToastViewport top="$8" left={0} right={0} />
            </ToastProvider>
          </TamaguiProvider>
        </DataProvider>
      </DragDropFile>
    </>
  )
}

const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [instance, setInstance] = useState(zero)

  useZeroEmit((next) => {
    setInstance(next)
  })

  return <ZeroProvider zero={instance}>{children}</ZeroProvider>
}
