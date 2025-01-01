import { useZero } from '@rocicorp/zero/react'
import { ScrollView } from 'tamagui'
import {
  Button,
  Card,
  H1,
  H2,
  H3,
  H5,
  Paragraph,
  SizableText,
  XStack,
  YStack,
  isWeb,
} from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Avatar } from '~/interface/Avatar'
import { isTauri } from '~/tauri/constants'
import { trpc } from '~/trpc/client'
import { useQuery } from '~/zero/zero'

export default function HomePage() {
  const { user, jwtToken, session } = useAuth()
  const z = useZero()
  const [courses] = useQuery((q) => q.course)

  const events = trpc.courses.addCoursesFromIcs.useMutation(undefined)

  const deleteAllCourses = async () => {
    await z.mutateBatch(async (m) => {
      await Promise.all(courses.map(m.course.delete))
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
          <Button onPress={() => events.mutate()}>Resync Courses from Calendar</Button>
        </XStack>
      )}

      <ScrollView>
        <H2>Your Courses</H2>
        {courses.length === 0 ? (
          <Paragraph>No courses.</Paragraph>
        ) : (
          courses.map((course) => (
            <Card elevate key={`course-${course.id}`}>
              <Card.Header padded>
                <H3>{course.courseName}</H3>
                <H5>{course.roomNumber}</H5>
              </Card.Header>
            </Card>
          ))
        )}
      </ScrollView>
    </YStack>
  )
}
