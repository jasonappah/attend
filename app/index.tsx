import { ScrollView } from 'tamagui'
import { Button, Card, H1, H2, H3, Paragraph, SizableText, XStack, YStack, isWeb } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Avatar } from '~/interface/Avatar'
import { isTauri } from '~/tauri/constants'
import { trpc } from '~/trpc/client'
import { zero } from '~/zero/zero'

export default function HomePage() {
  const { user, jwtToken, session } = useAuth()
  const courses = zero.query.course.materialize()

  const events = trpc.courses.addCoursesFromIcs.useQuery()

  const deleteAllCourses = async () => {
    await zero.mutateBatch(async (m) => {
      await Promise.all(courses.data.map((course) => m.course.delete(course.id)))
    })
  }

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
        <Button
          onPress={async () =>
            await authClient.signIn.social({
              provider: 'google',
            })
          }
        >
          Login with Google
        </Button>
      )}

      {user && (
        <XStack ai="center" gap="$4">
          <Button onPress={async () => await deleteAllCourses()}>Clear Courses</Button>
          <Button onPress={() => events.refetch()}>Refresh Events</Button>
        </XStack>
      )}

      <ScrollView>
        <H2>Your Courses</H2>
        {courses.data.length === 0 ? (
          <Paragraph>No courses.</Paragraph>
        ) : (
          courses.data.map((course) => (
            <Card elevate key={`course-${course.id}`}>
              <Card.Header padded>
                <H3>{course.name}</H3>
              </Card.Header>
            </Card>
          ))
        )}

        <Paragraph>{JSON.stringify(events.data ?? 'none', null, 2)}</Paragraph>
      </ScrollView>
    </YStack>
  )
}
