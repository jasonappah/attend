import '~/tamagui/styles'

import { ZeroProvider } from '@rocicorp/zero/react'
import { LoadProgressBar, SchemeProvider, Slot, Stack, useUserScheme } from 'one'
import { Platform } from 'react-native'
import { TamaguiProvider, View } from 'tamagui'
import { AuthEffects } from '~/better-auth/AuthEffects'
import { env } from '~/env'
import config from '~/tamagui/tamagui.config'
import { TRPCProvider } from '~/trpc/provider'
import { useZeroEmit } from '~/zero/zero'

export default function Layout() {
  if (Platform.OS === 'web') {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta property="og:image" content={`${env.ONE_SERVER_URL}/og.jpg`} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:image" content={`${env.ONE_SERVER_URL}/og.jpg`} />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <link rel="icon" href="/favicon.svg" />
        </head>

        <body>
          <LoadProgressBar startDelay={1_000} />
          <AppProviders>
            <AuthEffects />
            <Slot />
          </AppProviders>
        </body>
      </html>
    )
  }

  return (
    <AppProviders>
      <AuthEffects />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  )
}

const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <DataProvider>
      <SchemeProvider>
        <ThemeProvider>
          <TRPCProvider>
            <View flex={1}>{children}</View>
          </TRPCProvider>
        </ThemeProvider>
      </SchemeProvider>
    </DataProvider>
  )
}

const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const instance = useZeroEmit()

  return <ZeroProvider zero={instance}>{children}</ZeroProvider>
}

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { value: scheme } = useUserScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
