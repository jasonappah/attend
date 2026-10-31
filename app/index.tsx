import { type Href, Redirect, useParams } from 'one'
import { Button, H1, Paragraph, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { signInWithGoogle } from '~/better-auth/signIn'
import { Link } from '~/interface/Link'

export default function HomePage() {
  const { loggedIn } = useAuth()
  const params = useParams<{
    redirect?: string
    error?: string
  }>()

  // only follow same-site paths so ?redirect= can't bounce users to another domain
  // (browsers treat both `//host` and `/\host` as another origin)
  const redirect =
    params.redirect && /^\/(?![/\\])/.test(params.redirect) ? params.redirect : undefined

  if (redirect && loggedIn) {
    return <Redirect href={redirect as Href} />
  }

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
      <H1>Attend.</H1>

      <Paragraph>A simple app to track your class attendance.</Paragraph>

      {redirect && <Paragraph>You need to log in to continue.</Paragraph>}
      {params.error && <Paragraph>{params.error}</Paragraph>}

      {loggedIn ? (
        <Link href="/today">
          <Button>Continue</Button>
        </Link>
      ) : (
        <Button
          onPress={async () => {
            await signInWithGoogle(redirect)
          }}
        >
          Login with Google
        </Button>
      )}
    </YStack>
  )
}
