import { SizableText, YStack } from 'tamagui'
import { releaseInfoLines } from '~/features/app/releaseInfo'
import { getReleaseInfo } from '~/features/app/releaseInfoRuntime'

export function VersionInfo({ compact = false }: { compact?: boolean }) {
  return (
    <YStack items="center" gap="0-5" px="2" testID="settings-version-info">
      {releaseInfoLines(getReleaseInfo()).map((line) => (
        <SizableText key={line} size={compact ? '1' : '2'} color="color-10" textAlign="center">
          {line}
        </SizableText>
      ))}
    </YStack>
  )
}
