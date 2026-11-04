import 'takeout-native'
import '~/features/storage/setupStorage'
import '~/features/feedback/setupFeedback'
import '~/features/background-tasks/registerBackgroundTasks'
import * as nativeRegistry from '@tamagui/native-registry'
import { One } from 'one'
import { type ReactNode, useEffect } from 'react'
import { AppRegistry } from 'react-native'
import { withFeedback } from 'takeout-native/feedback/overlay'
import { setNativeStyleEngine } from 'tamagui'
import { createNativeUpdateCoordinator } from '~/features/app/nativeUpdates'

// tamagui's native fast path: compiled views (experimental.nativeFastPath in
// tamagui.build.ts) take theme changes through one native commit instead of a
// react re-render. a binary built without the module keeps the react path.
if (nativeRegistry.isAvailable()) {
  setNativeStyleEngine(nativeRegistry)
}

// the feedback overlay draws above every screen, so it mounts at the one point
// above one's root. an app that already registers a wrapper passes it to
// the feedback wrapper rather than replacing this call.
const startUpdates = createNativeUpdateCoordinator(One.Updates, __DEV__, (error) => {
  console.warn('Background update download failed; continuing current session.', error)
})

function NativeStartup({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Fetch after the first screen has mounted rather than in the startup path.
    const timer = setTimeout(startUpdates, 1000)
    return () => clearTimeout(timer)
  }, [])
  return children
}

AppRegistry.setWrapperComponentProvider(() => withFeedback(NativeStartup))
