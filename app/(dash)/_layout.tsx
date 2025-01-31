import { Redirect, Slot, Tabs, usePathname, useRouter } from 'one'
import { Button, SizableText, XStack, YStack, isWeb } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Gravatar } from '~/interface/Gravatar'
import { Link } from '~/interface/Link'
import { ToggleThemeButton } from '~/interface/theme/ThemeToggleButton'
import { isTauri } from '~/tauri/constants'
import { trpc } from '~/trpc/client'
export default function DashLayout() {
  const { user } = useAuth()
  const _pathname = usePathname()
  const addCoursesFromIcs = trpc.utils.addCoursesFromIcs.useMutation()
  const syncRoomsFromConcept3dMap = trpc.utils.syncRoomsFromConcept3dMap.useMutation()

  // if (!loggedIn) {
  //   // TODO: would be wise to validate this is on the current domain
  //   const redirectTo = encodeURIComponent(pathname);
  //   return <Redirect href={`/?redirect=${redirectTo}`} />;
  // }

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
