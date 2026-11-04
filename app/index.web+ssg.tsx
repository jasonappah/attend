import { H1, Paragraph, XStack, YStack } from 'tamagui'
import { Link } from '~/interface/app/Link'
import { Button } from '~/interface/buttons/Button'

// the github release asset the hero's download button points to, offered here
// so the web landing can install without importing the full hero.
const APK_RELEASE_URL =
  'https://github.com/jasonappah/attend/releases/latest/download/app-release.apk'

// web-only landing: the native boot resolves its own session-aware target in
// index+ssg.tsx, so this file is never evaluated on native.
export default function WebIndex() {
  return (
    <YStack width="100%" maxW={600} self="center" p={24} gap={16}>
      <H1>Attend.</H1>
      <Paragraph>A simple app to track your class attendance.</Paragraph>
      <XStack gap={10} items="center" justify="center">
        <Link href="/auth/login" asChild>
          <Button accent testID="public-app-entry">
            Open Attend
          </Button>
        </Link>
        <Link href={APK_RELEASE_URL} asChild>
          <Button subtle>Download APK</Button>
        </Link>
      </XStack>
    </YStack>
  )
}
