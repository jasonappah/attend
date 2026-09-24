import { Redirect, useParams } from 'one'
import { Button, H1, Paragraph, YStack } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Link } from '~/interface/Link'

export default function HomePage() {
  const { loggedIn } = useAuth()
  const params = useParams<{
    redirect?: string
    error?: string
  }>()

  if (params.redirect && loggedIn) {
    return <Redirect href={params.redirect} />
  }

  return (
    <YStack
      $platform-ios={{ pt: '$10' }}
      flex={1}
      p="$4"
      gap="$4"
      items="flex-start"
      maxW={600}
      width="100%"
      self="center"
    >
      <H1>Attend.</H1>

      <Paragraph>A simple app to track your class attendance.</Paragraph>

      {params.redirect && <Paragraph>You need to log in to continue.</Paragraph>}
      {params.error && <Paragraph>{params.error}</Paragraph>}

      {loggedIn ? (
        <Link href="/today">
          <Button>Continue</Button>
        </Link>
      ) : (
        <Button
          onPress={async () => {
            await authClient.signIn.social({
              provider: 'google',
              callbackURL: params.redirect,
            })
          }}
        >
          Login with Google
        </Button>
      )}
    </YStack>
  )
}
