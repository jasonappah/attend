import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { PortalProvider } from 'react-native-teleport'

export function PlatformSpecificRootProvider({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <PortalProvider>{children}</PortalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
