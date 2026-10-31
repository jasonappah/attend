import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { isTauri } from '../tauri/constants'
import { setAuthClientToken } from './authClient'

// Tauri opens OAuth in the system browser, then hands the session back over
// the attend:// deep link. This is web/desktop-only, so the native build swaps
// in a no-op implementation.
export function useTauriDeepLink() {
  useEffect(() => {
    if (!isTauri) return

    let unlisten: (() => void) | undefined

    onOpenUrl(([urlString]) => {
      try {
        const url = new URL(urlString)

        if (url.host === 'finish-auth') {
          const session = url.searchParams.get('session')
          if (session) setAuthClientToken({ session })
        }
      } catch (err) {
        console.error(err)
      }
    })
      .then((cleanup) => {
        unlisten = cleanup
      })
      .catch(console.error)

    return () => {
      unlisten?.()
    }
  }, [])
}
