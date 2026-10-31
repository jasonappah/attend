import { type Href, Redirect, Slot, usePathname } from 'one'
import { Button, SizableText, XStack, YStack } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Gravatar } from '~/interface/Gravatar'
import { Link } from '~/interface/Link'
import { ToggleThemeButton } from '~/interface/theme/ThemeToggleButton'
export default function DashLayout() {
  const { user, loggedIn, isPending } = useAuth()
  const pathname = usePathname()

  if (isPending) {
    // TODO: render loading
    return null
  }

  if (!loggedIn) {
    // the home page validates this stays on our domain before following it
    return <Redirect href={`/?redirect=${encodeURIComponent(pathname)}` as Href} />
  }

  // TODO: use a drawer
  return (
    <YStack
      flex={1}
      p="4"
      pt="4 ios:10"
      gap="4"
      items="flex-start"
      maxW={600}
      width="100%"
      self="center"
    >
      <XStack items="center" gap="4">
        <Gravatar email={user?.email || ''} />
        <SizableText>{user?.name}</SizableText>

        <Button onPress={() => authClient.signOut()}>Logout</Button>

        {/* {isWeb && !isTauri && jwtToken && (
          <a href={`one-zero://finish-auth?token=${session?.token}`}>
            <Button>Login in Tauri</Button>
          </a>
        )} */}
        <ToggleThemeButton />
      </XStack>

      <XStack gap="4">
        <Link href="/today" asChild>
          <Button>Today</Button>
        </Link>
        <Link href="/history" asChild>
          <Button>History</Button>
        </Link>
        <Link href="/settings" asChild>
          <Button>Settings</Button>
        </Link>
      </XStack>
      <Slot />
    </YStack>
  )
}
