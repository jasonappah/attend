import { useNetworkState } from 'one'
import { Paragraph, SizableText, XStack, YStack } from 'tamagui'

/**
 * A subtle banner shown while the device has no connection. Reads keep
 * working (Zero is local-first) but writes are held until the connection
 * comes back. Uses One's `useNetworkState`, which reports `type === 'none'`
 * exactly when the system has no connection on any platform.
 */
export function OfflineBanner() {
  const { type } = useNetworkState()
  if (type !== 'none') return null

  return (
    <YStack
      width="100%"
      px={16}
      py={10}
      gap={6}
      backgroundColor="orange-800"
      borderColor="orange-500"
      borderWidth={1}
      rounded="sm"
    >
      <XStack gap={10} items="center">
        <SizableText size="4" color="orange-100" fontWeight="600">
          You're offline
        </SizableText>
        <Paragraph color="orange-100" size="sm" numberOfLines={2}>
          Changes are held until you reconnect.
        </Paragraph>
      </XStack>
    </YStack>
  )
}
