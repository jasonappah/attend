import { Redirect, Slot, usePathname } from 'expo-router'
import { Button, SizableText, XStack, YStack, isTauri } from 'tamagui'
import { authClient } from '~/better-auth/authClient'
import { Gravatar } from '~/interface/Gravatar'
import { Link } from '~/interface/Link'
import { ToggleThemeButton } from '~/interface/theme/ThemeToggleButton'
import { trpc } from '~/trpc/client'

export default function DashLayout() {
  const { data, isPending, error } = authClient.useSession()
  const pathname = usePathname()
  const addCoursesFromIcs = trpc.utils.addCoursesFromIcs.useMutation()
  const syncRoomsFromConcept3dMap = trpc.utils.syncRoomsFromConcept3dMap.useMutation()

  if (isPending) {
    // TODO: render loading
    return null
  }

  if (error) {
    // TODO: render error
    return null
  }

  if (!data) {
    const redirectTo = encodeURIComponent(pathname)
    return <Redirect href={`/?redirect=${redirectTo}`} />
  }
  const { user } = data

  // TODO: use a drawer
  return (
    <YStack
      $platform-ios={{ pt: '$10' }}
      f={1}
      p="$4"
      gap="$4"
      ai="flex-start"
      maw={600}
      w="100%"
      als="center"
    >
      <XStack ai="center" gap="$4">
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

      <XStack gap="$4">
        <Button onPress={() => addCoursesFromIcs.mutate()}>Resync Courses from Calendar</Button>
        <Button onPress={() => syncRoomsFromConcept3dMap.mutate()}>
          Resync Rooms from Concept3D Map
        </Button>
        <Link href="/today">
          <Button>Today</Button>
        </Link>
        <Link href="/history">
          <Button>History</Button>
        </Link>
      </XStack>
      <Slot />
    </YStack>
  )
}
