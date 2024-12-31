import { Button, H1, SizableText, XStack, YStack, isWeb } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Avatar } from '~/interface/Avatar'
import { isTauri } from '~/tauri/constants'

export default function HomePage() {
  const { user, jwtToken, session } = useAuth()
  
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
      <H1>Welcome</H1>

      {user ? (
        <XStack ai="center" gap="$4">
          <Avatar image={user.image || ''} />
          <SizableText>{user.name}</SizableText>

          <Button onPress={() => authClient.signOut()}>Logout</Button>

          {isWeb && !isTauri && jwtToken && (
            <a href={`one-zero://finish-auth?token=${session?.token}`}>
              <Button>Login in Tauri</Button>
            </a>
          )}
        </XStack>
      ) : (
        <Button onPress={async () => await authClient.signIn.social({
          provider: 'google',
        })}>Login with Google</Button>
      )}
    </YStack>
  )
}
