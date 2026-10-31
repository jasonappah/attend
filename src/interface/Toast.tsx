import { Toast, toast as showToast } from '@tamagui/toast'
import type { ExternalToast } from '@tamagui/toast'

export const toast = (title: string, options?: ExternalToast & { message?: string }) => {
  const { message, ...rest } = options ?? {}
  return showToast(title, { ...rest, description: message ?? rest.description })
}

export const hideToast = () => showToast.dismiss()

export const ToastDisplay = () => (
  <Toast>
    <Toast.Viewport>
      <Toast.List />
    </Toast.Viewport>
  </Toast>
)
